FROM python:3.12-slim

WORKDIR /app

# Install uv — fast Python package manager
RUN pip install --no-cache-dir uv

# System deps for OpenCV + PaddlePaddle
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1 libgomp1 libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
# uv pip compile generates a locked requirements file, then installs from it.
# This avoids needing a uv.lock committed to the repo while still being fast.
RUN uv pip install --system --no-cache \
    fastapi==0.111.0 \
    "uvicorn[standard]==0.29.0" \
    python-multipart==0.0.9 \
    opencv-python-headless==4.10.0.84 \
    "numpy>=1.26.4" \
    "Pillow>=10.3.0" \
    paddlepaddle==2.6.2 \
    paddleocr==2.9.1 \
    rapidfuzz \
    requests \
    setuptools

# Build the card name database and bake it into the image layer.
# Set BUILD_CARD_DB=false to skip (e.g. during development / fast rebuilds).
# Default is true so production builds always have a fresh DB.
#
# --mount=type=cache persists /cache/carddb across docker build retries so
# the PT checkpoint survives a build timeout — the next attempt resumes PT
# from the last saved page instead of starting from scratch.
# EN is fetched via the Scryfall bulk-data API (single ~100 MB download) and
# is fast enough to re-run on every retry without a cache.
ARG BUILD_CARD_DB=true
COPY build_card_db.py .
RUN --mount=type=cache,target=/cache/carddb \
    if [ "$BUILD_CARD_DB" = "true" ]; then \
        CARDDB_DIR=/cache/carddb python build_card_db.py \
        && mkdir -p /app/carddb_seed \
        && cp -r /cache/carddb/. /app/carddb_seed/ \
        && rm -f /app/carddb_seed/pt_checkpoint.json \
                 /app/carddb_seed/pt_checkpoint.json.tmp; \
    else echo "[CardDB] Skipping DB build (BUILD_CARD_DB=false)"; fi

COPY app.py entrypoint.sh build_card_db.py ./
RUN chmod +x entrypoint.sh

EXPOSE 8001
CMD ["./entrypoint.sh"]
