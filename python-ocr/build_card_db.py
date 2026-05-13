"""
build_card_db.py — one-time (and periodic) MTG card database builder.

Fetches all English + Portuguese cards from the Scryfall API and writes:
  - cards_db.json    : flat list of card names (for RapidFuzz fuzzy matching)
  - cards_index.json : dict keyed by normalised name → slim card object
                       (for zero-HTTP local lookups during scanning)

Run directly:
    python build_card_db.py

Also imported by app.py for the periodic background refresh:
    from build_card_db import build as _build_card_db
"""

import json
import logging
import os
import time
import unicodedata

import requests

log = logging.getLogger("ocr")

SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search"
CARDDB_DIR   = os.environ.get("CARDDB_DIR", os.path.join(os.path.dirname(__file__), "carddb"))
OUTPUT_NAMES = os.path.join(CARDDB_DIR, "cards_db.json")
OUTPUT_INDEX = os.path.join(CARDDB_DIR, "cards_index.json")

# Scryfall asks for ≥ 50–100 ms between requests and a descriptive User-Agent.
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


def _get_with_retry(url: str, max_retries: int = 5) -> requests.Response:
    """GET with exponential backoff on 429 (rate limit) responses."""
    delay = 5.0
    for attempt in range(max_retries):
        r = requests.get(url, timeout=30, headers=_HEADERS)
        if r.status_code == 429:
            retry_after = float(r.headers.get("Retry-After", delay))
            wait = max(retry_after, delay)
            log.warning("[CardDB] 429 rate limited — waiting %.1fs (attempt %d/%d)",
                        wait, attempt + 1, max_retries)
            time.sleep(wait)
            delay *= 2
            continue
        return r
    return requests.get(url, timeout=30, headers=_HEADERS)


def _fetch_lang(lang: str) -> list:
    """
    Paginate /cards/search?q=lang:<lang>&unique=cards&order=released&dir=desc
    and return a list of full card objects (one — the latest printing — per card).
    """
    log.info("[CardDB] Fetching %s cards (paginated)...", lang.upper())
    cards = []
    url = (
        f"{SCRYFALL_SEARCH_URL}?q=lang%3A{lang}"
        "&unique=cards&order=released&dir=desc"
    )
    page = 1

    while url:
        r = _get_with_retry(url)
        time.sleep(_REQUEST_DELAY)

        if r.status_code != 200:
            log.warning("[CardDB] %s page %d failed (HTTP %d) — stopping early",
                        lang.upper(), page, r.status_code)
            break

        data = r.json()
        cards.extend(data.get("data", []))
        url = data.get("next_page") if data.get("has_more") else None
        log.info("[CardDB] %s page %d — %d cards so far", lang.upper(), page, len(cards))
        page += 1

    log.info("[CardDB] %s: %d cards total", lang.upper(), len(cards))
    return cards


def build() -> list:
    """
    Fetch EN + PT cards, write cards_db.json and cards_index.json,
    and return the flat name list (for app.py hot-reload).

    Index key priority:
      PT printed names → PT card objects  (OCR reads PT text from PT card)
      EN names         → EN card objects  (OCR reads EN text from EN card)
    EN entries overwrite PT for shared normalised-EN-name keys so EN scans
    always resolve to an EN UUID.
    """
    pt_cards = _fetch_lang("pt")
    en_cards = _fetch_lang("en")

    names: set  = set()
    index: dict = {}

    # ── PT cards: index by printed_name (Portuguese) ───────────────────────────
    for card in pt_cards:
        slim  = _slim(card)
        faces = card.get("card_faces") or []
        if faces:
            for face in faces:
                pn = face.get("printed_name") or face.get("name")
                if pn:
                    names.add(pn)
                    index[_normalize(pn)] = slim
        else:
            pn = card.get("printed_name") or card.get("name")
            if pn:
                names.add(pn)
                index[_normalize(pn)] = slim

    # ── EN cards: index by name, overwrite PT for shared keys ─────────────────
    for card in en_cards:
        slim  = _slim(card)
        faces = card.get("card_faces") or []
        if faces:
            for face in faces:
                n = face.get("name")
                if n:
                    names.add(n)
                    index[_normalize(n)] = slim
        else:
            n = card.get("name")
            if n:
                names.add(n)
                index[_normalize(n)] = slim

    all_names = sorted(names)

    os.makedirs(CARDDB_DIR, exist_ok=True)
    with open(OUTPUT_NAMES, "w", encoding="utf-8") as f:
        json.dump(all_names, f, ensure_ascii=False)

    with open(OUTPUT_INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False)

    names_mb = os.path.getsize(OUTPUT_NAMES) / (1024 * 1024)
    index_mb = os.path.getsize(OUTPUT_INDEX) / (1024 * 1024)
    log.info(
        "[CardDB] Saved %d names → cards_db.json (%.2f MB), "
        "%d entries → cards_index.json (%.2f MB)",
        len(all_names), names_mb, len(index), index_mb,
    )
    return all_names


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build()
