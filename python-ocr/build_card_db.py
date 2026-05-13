"""
build_card_db.py — MTG card database builder.

Fetches all English + Portuguese cards from the Scryfall API and writes:
  - cards_db.json    : flat list of card names (for RapidFuzz fuzzy matching)
  - cards_index.json : dict keyed by normalised name → slim card object
                       (for zero-HTTP local lookups during scanning)

English cards are fetched via the Scryfall bulk-data API (single ~100 MB
download, no pagination — much faster than 40+ paginated search requests).

Portuguese cards are fetched via the paginated search API with
checkpoint/resume: progress is saved to pt_checkpoint.json after every page
so an interrupted run (container restart, Docker build timeout, etc.) picks
up from the last completed page instead of starting over.

Usage:
    python build_card_db.py           # skip if DB already exists
    python build_card_db.py --force   # force full rebuild

Also imported by app.py for the periodic background refresh:
    from build_card_db import build as _build_card_db
    names = build(force=True)
"""

import argparse
import json
import logging
import os
import time
import unicodedata

import requests

log = logging.getLogger("ocr")

SCRYFALL_BULK_URL   = "https://api.scryfall.com/bulk-data"
SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search"

CARDDB_DIR    = os.environ.get("CARDDB_DIR", os.path.join(os.path.dirname(__file__), "carddb"))
OUTPUT_NAMES  = os.path.join(CARDDB_DIR, "cards_db.json")
OUTPUT_INDEX  = os.path.join(CARDDB_DIR, "cards_index.json")
PT_CHECKPOINT = os.path.join(CARDDB_DIR, "pt_checkpoint.json")

# Scryfall asks for ≥ 50–100 ms between paginated requests.
_REQUEST_DELAY = 0.15
_HEADERS = {"User-Agent": "mtgchest-scanner/1.0", "Accept": "application/json"}


def _normalize(text: str) -> str:
    """Strip diacritics and lowercase — must stay in sync with app.py."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _slim(card: dict) -> dict:
    """Keep only the fields the frontend scanner carousel needs."""
    faces = [
        {"name": f.get("name"), "image_uris": f.get("image_uris")}
        for f in (card.get("card_faces") or [])
    ]
    return {
        "id":               card.get("id"),
        "name":             card.get("name"),
        "printed_name":     card.get("printed_name"),
        "image_uris":       card.get("image_uris"),
        "card_faces":       faces or None,
        "prices":           card.get("prices"),
        "set_name":         card.get("set_name"),
        "collector_number": card.get("collector_number"),
        "rarity":           card.get("rarity"),
    }


def _get_with_retry(url: str, max_retries: int = 5, timeout: int = 30) -> requests.Response:
    """GET with exponential backoff on 429 (rate limit) responses."""
    delay = 5.0
    for attempt in range(max_retries):
        r = requests.get(url, timeout=timeout, headers=_HEADERS)
        if r.status_code == 429:
            wait = max(float(r.headers.get("Retry-After", delay)), delay)
            log.warning("[CardDB] 429 rate limited — waiting %.1fs (attempt %d/%d)",
                        wait, attempt + 1, max_retries)
            time.sleep(wait)
            delay *= 2
            continue
        return r
    return requests.get(url, timeout=timeout, headers=_HEADERS)


# ── EN: Scryfall bulk-data (single download) ──────────────────────────────────

def _fetch_en_bulk() -> list:
    """
    Fetch EN cards via the Scryfall bulk-data API.
    'default_cards' = one card object per unique English card name.
    Single ~100 MB download — replaces 40+ paginated search requests.
    """
    log.info("[CardDB] Fetching Scryfall bulk-data manifest...")
    r = _get_with_retry(SCRYFALL_BULK_URL)
    r.raise_for_status()

    uri = next(
        (e["download_uri"] for e in r.json().get("data", [])
         if e.get("type") == "default_cards"),
        None,
    )
    if not uri:
        raise RuntimeError("[CardDB] 'default_cards' not found in Scryfall bulk-data manifest")

    log.info("[CardDB] Downloading default_cards (~100 MB)...")
    r = requests.get(uri, timeout=300, headers=_HEADERS)
    r.raise_for_status()

    cards = r.json()
    en_cards = [c for c in cards if c.get("lang") == "en"]
    log.info("[CardDB] EN bulk: %d cards", len(en_cards))
    return en_cards


# ── PT: paginated with checkpoint/resume ──────────────────────────────────────

def _save_pt_checkpoint(cards: list, next_page, page: int) -> None:
    """
    Atomic checkpoint write (write-then-rename so a crash mid-write
    never leaves a corrupt file).
    next_page=None means the fetch is complete.
    """
    os.makedirs(CARDDB_DIR, exist_ok=True)
    tmp = PT_CHECKPOINT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"cards": cards, "next_page": next_page, "page": page},
                  f, ensure_ascii=False)
    os.replace(tmp, PT_CHECKPOINT)


def _fetch_pt_paginated() -> list:
    """
    Paginate lang:pt cards with checkpoint/resume.

    - Saves pt_checkpoint.json after every page.
    - On restart, resumes from the last saved next_page URL.
    - If next_page is None in the checkpoint the fetch was already complete;
      returns cached cards immediately without any HTTP requests.
    - On HTTP error mid-way, saves checkpoint (retrying the failed page next
      time) and returns partial data so build() can still write a valid DB.
    """
    cards: list = []
    page:  int  = 1

    # ── Resume from checkpoint ────────────────────────────────────────────────
    if os.path.exists(PT_CHECKPOINT):
        try:
            with open(PT_CHECKPOINT, encoding="utf-8") as f:
                ckpt = json.load(f)
            cards    = ckpt.get("cards", [])
            next_url = ckpt.get("next_page")   # None → fetch was complete
            page     = ckpt.get("page", 1)

            if next_url is None:
                log.info("[CardDB] PT checkpoint: already complete (%d cards)", len(cards))
                return cards

            log.info("[CardDB] Resuming PT from page %d (%d cards already fetched)",
                     page, len(cards))
            url = next_url
        except (json.JSONDecodeError, KeyError) as exc:
            log.warning("[CardDB] Corrupt PT checkpoint (%s) — starting from scratch", exc)
            cards = []
            page  = 1
            url   = (f"{SCRYFALL_SEARCH_URL}?q=lang%3Apt"
                     "&unique=cards&order=released&dir=desc")
    else:
        url = (f"{SCRYFALL_SEARCH_URL}?q=lang%3Apt"
               "&unique=cards&order=released&dir=desc")

    log.info("[CardDB] Fetching PT cards (paginated)...")

    while url:
        r = _get_with_retry(url)
        time.sleep(_REQUEST_DELAY)

        if r.status_code != 200:
            log.warning("[CardDB] PT page %d — HTTP %d, checkpoint saved, will resume on next run",
                        page, r.status_code)
            # Save with the current URL so we retry this exact page next time.
            _save_pt_checkpoint(cards, url, page)
            return cards   # partial data is still usable for EN+PT merge

        data     = r.json()
        cards.extend(data.get("data", []))
        next_url = data.get("next_page") if data.get("has_more") else None
        log.info("[CardDB] PT page %d — %d cards so far", page, len(cards))
        page    += 1

        # Persist after every page.
        # next_url=None means "done" — checkpoint kept until output files are
        # written so a crash between PT-done and file-write can still recover.
        _save_pt_checkpoint(cards, next_url, page)
        url = next_url

    log.info("[CardDB] PT: %d cards total", len(cards))
    return cards


# ── Helpers ───────────────────────────────────────────────────────────────────

def _card_names_for(card: dict, printed: bool) -> list:
    """Return all relevant name strings from a card object (handles DFCs)."""
    field = "printed_name" if printed else "name"
    faces = card.get("card_faces") or []
    if faces:
        return [n for face in faces
                for n in [(face.get(field) or face.get("name"))]
                if n]
    n = card.get(field) or card.get("name")
    return [n] if n else []


# ── Main build ────────────────────────────────────────────────────────────────

def build(force: bool = False) -> list:
    """
    Fetch EN (bulk) + PT (paginated + checkpoint), write DB files,
    and return the flat name list for app.py hot-reload.

    force=False  — skip entirely if both output files already exist.
                   Used by the entrypoint seed-copy logic and startup load.
    force=True   — always rebuild (weekly refresh, manual /admin/rebuild-db).

    Index key priority:
      PT printed names → PT card objects  (OCR reads PT text from PT card)
      EN names         → EN card objects  (OCR reads EN text from EN card)
    EN overwrites PT for shared normalised keys so EN scans always resolve
    to an EN UUID.
    """
    if not force and os.path.exists(OUTPUT_NAMES) and os.path.exists(OUTPUT_INDEX):
        log.info("[CardDB] DB files already exist — skipping (use --force to rebuild)")
        with open(OUTPUT_NAMES, encoding="utf-8") as f:
            return json.load(f)

    # PT first so the checkpoint is as useful as possible on timeout/retry.
    pt_cards = _fetch_pt_paginated()
    en_cards = _fetch_en_bulk()

    names: set  = set()
    index: dict = {}

    for card in pt_cards:
        slim = _slim(card)
        for pn in _card_names_for(card, printed=True):
            names.add(pn)
            index[_normalize(pn)] = slim

    for card in en_cards:
        slim = _slim(card)
        for n in _card_names_for(card, printed=False):
            names.add(n)
            index[_normalize(n)] = slim

    all_names = sorted(names)

    os.makedirs(CARDDB_DIR, exist_ok=True)
    with open(OUTPUT_NAMES, "w", encoding="utf-8") as f:
        json.dump(all_names, f, ensure_ascii=False)
    with open(OUTPUT_INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False)

    # Output files written — safe to clean up the PT checkpoint.
    if os.path.exists(PT_CHECKPOINT):
        try:
            os.remove(PT_CHECKPOINT)
        except OSError:
            pass

    names_mb = os.path.getsize(OUTPUT_NAMES) / (1024 * 1024)
    index_mb = os.path.getsize(OUTPUT_INDEX) / (1024 * 1024)
    log.info(
        "[CardDB] Saved %d names (%.2f MB) + %d index entries (%.2f MB)",
        len(all_names), names_mb, len(index), index_mb,
    )
    return all_names


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="Rebuild even if DB files already exist")
    args = ap.parse_args()
    build(force=args.force)
