#!/bin/sh
set -e

# Pre-download PaddleOCR models into the persisted volume (/root/.paddleocr).
# Only runs on first container start; subsequent starts reuse the cached models.
PADDLE_MODEL_DIR="${HOME}/.paddleocr/whl"
if [ ! -d "$PADDLE_MODEL_DIR" ] || [ -z "$(ls -A "$PADDLE_MODEL_DIR" 2>/dev/null)" ]; then
    echo "[python-ocr] Downloading PaddleOCR models (one-time, will be cached)..."
    python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)" \
        || echo "[Warning] PaddleOCR model download failed — will retry on first request"
else
    echo "[python-ocr] PaddleOCR models already cached."
fi

# Seed the card DB volume from the baked image data (first start after build).
# Subsequent starts reuse the already-populated volume — no Scryfall calls.
if [ ! -f /app/carddb/cards_db.json ]; then
    if [ -f /app/carddb_seed/cards_db.json ]; then
        echo "[python-ocr] Seeding card DB from image into volume (one-time copy)..."
        mkdir -p /app/carddb
        cp -r /app/carddb_seed/. /app/carddb/
    else
        echo "[python-ocr] No baked DB found — building from Scryfall (may take a few minutes)..."
        python /app/build_card_db.py
    fi
fi

echo "[python-ocr] Starting server..."
exec uvicorn app:app --host 0.0.0.0 --port 8001
