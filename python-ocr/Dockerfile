FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Pre-download EasyOCR models at build time
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

# Build the card name database and bake it into the image layer.
# Docker caches this layer; it only re-runs when build_card_db.py changes.
COPY build_card_db.py .
RUN python build_card_db.py

COPY app.py entrypoint.sh build_card_db.py ./
RUN chmod +x entrypoint.sh

EXPOSE 8001
CMD ["./entrypoint.sh"]
