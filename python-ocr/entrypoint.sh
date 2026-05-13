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

# Build (or resume) the card DB into the persisted volume (/app/carddb).
# - Skips immediately if cards_db.json already exists (nothing to do).
# - Resumes PT pagination from pt_checkpoint.json if a previous run was interrupted.
# - EN uses the Scryfall bulk-data API (~100 MB, ~30 s) — no checkpoint needed.
echo "[python-ocr] Initialising card DB..."
python /app/build_card_db.py

echo "[python-ocr] Starting server..."
exec uvicorn app:app --host 0.0.0.0 --port 8001
