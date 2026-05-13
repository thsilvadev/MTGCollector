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
ARG BUILD_CARD_DB=true
COPY build_card_db.py .
RUN if [ "$BUILD_CARD_DB" = "true" ]; then \
        CARDDB_DIR=/app/carddb_seed python build_card_db.py; \
    else echo "[CardDB] Skipping DB build (BUILD_CARD_DB=false)"; fi

COPY app.py entrypoint.sh build_card_db.py ./
RUN chmod +x entrypoint.sh

EXPOSE 8001
CMD ["./entrypoint.sh"]
