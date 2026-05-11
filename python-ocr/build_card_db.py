"""
build_card_db.py — one-time (and weekly) MTG card name database builder.

Fetches all English + Portuguese card names from the official Scryfall API
and writes them as a flat JSON list to cards_db.json in the same directory.

Run directly:
    python build_card_db.py

Also imported by app.py for the weekly background refresh:
    from build_card_db import build as _build_card_db
"""

import json
import logging
import os
import time

import requests

log = logging.getLogger("ocr")

SCRYFALL_CATALOG_URL = "https://api.scryfall.com/catalog/card-names"
SCRYFALL_SEARCH_URL  = "https://api.scryfall.com/cards/search"
OUTPUT_FILE          = os.path.join(os.path.dirname(__file__), "cards_db.json")

# Scryfall asks for ≥ 50–100 ms between requests.
_REQUEST_DELAY = 0.15


def _fetch_english_names() -> list:
    log.info("[CardDB] Fetching English card names from catalog...")
    r = requests.get(SCRYFALL_CATALOG_URL, timeout=30)
    r.raise_for_status()
    names = r.json().get("data", [])
    log.info("[CardDB] %d English names fetched", len(names))
    return names


def _get_with_retry(url: str, max_retries: int = 5) -> requests.Response:
    """GET with exponential backoff on 429 (rate limit) responses."""
    delay = 5.0
    for attempt in range(max_retries):
        r = requests.get(url, timeout=30)
        if r.status_code == 429:
            retry_after = float(r.headers.get("Retry-After", delay))
            wait = max(retry_after, delay)
            log.warning("[CardDB] 429 rate limited — waiting %.1fs (attempt %d/%d)",
                        wait, attempt + 1, max_retries)
            time.sleep(wait)
            delay *= 2  # exponential backoff
            continue
        return r
    # Last attempt — return whatever we get
    return requests.get(url, timeout=30)


def _fetch_portuguese_names() -> list:
    log.info("[CardDB] Fetching Portuguese card names (paginated)...")
    pt_names: set = set()
    url = f"{SCRYFALL_SEARCH_URL}?q=lang%3Apt&unique=cards"
    page = 1

    while url:
        r = _get_with_retry(url)
        time.sleep(_REQUEST_DELAY)

        if r.status_code != 200:
            log.warning("[CardDB] PT page %d failed (HTTP %d) — stopping early", page, r.status_code)
            break

        data = r.json()

        for card in data.get("data", []):
            # Top-level printed_name (single-faced cards)
            pn = card.get("printed_name")
            if pn:
                pt_names.add(pn)
            # Double-faced / split cards
            for face in card.get("card_faces", []):
                fpn = face.get("printed_name")
                if fpn:
                    pt_names.add(fpn)

        url = data.get("next_page") if data.get("has_more") else None
        log.info("[CardDB] PT page %d — %d names so far", page, len(pt_names))
        page += 1

    log.info("[CardDB] %d Portuguese names fetched", len(pt_names))
    return list(pt_names)


def build() -> list:
    """
    Fetch EN + PT card names, write cards_db.json, and return the combined list.
    Designed to be called both from __main__ and from the weekly refresh task.
    """
    en = _fetch_english_names()
    pt = _fetch_portuguese_names()
    all_names = list(set(en + pt))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_names, f, ensure_ascii=False)

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    log.info("[CardDB] Saved %d unique names → %s (%.2f MB)", len(all_names), OUTPUT_FILE, size_mb)
    return all_names


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build()
