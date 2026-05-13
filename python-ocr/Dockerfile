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

COPY app.py entrypoint.sh build_card_db.py ./
RUN chmod +x entrypoint.sh

EXPOSE 8001
CMD ["./entrypoint.sh"]
