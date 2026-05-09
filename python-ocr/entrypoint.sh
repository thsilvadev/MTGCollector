#!/bin/sh
set -e

echo "[python-ocr] Starting server..."
exec uvicorn app:app --host 0.0.0.0 --port 8001
