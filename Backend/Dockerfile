FROM node:20-alpine

# librsvg is required by sharp for SVG → PNG conversion (used by npm run build-icons)
RUN apk add --no-cache librsvg wget

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Download Tesseract language data into the image (~4 MB each, tessdata_fast).
# Baking them in avoids a slow CDN download on first OCR request in production.
RUN wget -q -O eng.traineddata \
      https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata && \
    wget -q -O por.traineddata \
      https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata

COPY knexfile.js ./
COPY src/ ./src/
COPY database/ ./database/

EXPOSE 3000

# Run pending SQL migrations then start the server.
CMD ["sh", "-c", "node database/migrate.js && node src/server.js"]
