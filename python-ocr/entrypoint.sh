#!/bin/sh
set -e

# Safety net: build the card DB if it was somehow missing from the image.
if [ ! -f /app/cards_db.json ]; then
    echo "[python-ocr] cards_db.json missing — building now (may take a few minutes)..."
    python /app/build_card_db.py
fi

echo "[python-ocr] Starting server..."
exec uvicorn app:app --host 0.0.0.0 --port 8001
