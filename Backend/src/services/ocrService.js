/**
 * OCR Service — currently backed by Tesseract.js (free, local, no API key).
 *
 * ── HOW TO SWAP TO GOOGLE CLOUD VISION ──────────────────────────────────────
 * Replace only the extractText() function body:
 *
 *   const vision = require('@google-cloud/vision');
 *   const client = new vision.ImageAnnotatorClient();
 *
 *   async function extractText(imageBuffer) {
 *     const [result] = await client.textDetection({
 *       image: { content: imageBuffer.toString('base64') }
 *     });
 *     return result.textAnnotations?.[0]?.description || '';
 *   }
 *
 * parseFooter() and parseCardName() stay unchanged.
 * ────────────────────────────────────────────────────────────────────────────
 */

const Tesseract = require('tesseract.js');
const path      = require('path');

// Persistent worker — initialized once, reused across requests.
// First use downloads language data: ~10 MB for 'eng', ~6 MB for 'por' (cached).
// 'por' is needed for Portuguese card names (ç, ã, á, etc.)
// OEM 1 = LSTM only (much better than OEM 3 default for display/decorative fonts like MTG Beleren)
let worker = null;

// Traineddata lives at /app/*.traineddata in Docker (downloaded during image build)
// and at Backend/*.traineddata locally. Two directories up from this file.
const LANG_PATH = path.join(__dirname, '../..');

async function getWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker(['eng', 'por'], 1, { langPath: LANG_PATH }); // 1 = OEM_LSTM_ONLY
  }
  return worker;
}

/**
 * Extract text from an image buffer using OCR.
 * @param {Buffer} imageBuffer  — pre-processed image (grayscale, upscaled)
 * @param {object} [options]
 * @param {number} [options.psm=6]      — Tesseract page segmentation mode
 *                                         6 = uniform block, 7 = single text line
 * @param {string} [options.whitelist=''] — restrict recognized characters
 * @returns {Promise<string>}   — raw OCR text
 */
async function extractText(imageBuffer, options = {}) {
  const { psm = 6, whitelist = '' } = options;
  const w = await getWorker();
  await w.setParameters({
    tessedit_pageseg_mode:   String(psm),
    tessedit_char_whitelist: whitelist,
  });
  const { data: { text } } = await w.recognize(imageBuffer);
  return text;
}

/**
 * Try to extract set code + collector number from footer OCR text.
 * Matches patterns like:
 *   "XLN · 96/279 · U"    "M19 • 200/280 • R"    "ONE 150/271"
 *
 * @param {string} text
 * @returns {{ setCode: string, collectorNumber: string } | null}
 */
function parseFooter(text) {
  const match = text.match(/\b([A-Z0-9]{2,5})\s*[·•\-]\s*(\d+[a-z]?)(?:\/\d+)?/);
  if (match) {
    return { setCode: match[1].toLowerCase(), collectorNumber: match[2] };
  }
  return null;
}

/**
 * Extract card name from OCR text (first non-empty line).
 * @param {string} text
 * @returns {string}
 */
function parseCardName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const line = lines[0] || '';
  // Letters only (including accented), apostrophes, and hyphens.
  // We skip leading garbage tokens (|, {, [, etc.) then collect consecutive
  // real-word tokens and stop at the first garbage token after we've started.
  const wordOnly = /^[a-zA-Z\u00C0-\u024F''-]{2,}$/;
  const tokens = line.split(/\s+/);
  let started = false;
  const clean = [];
  for (const tok of tokens) {
    if (wordOnly.test(tok)) {
      started = true;
      clean.push(tok);
    } else if (started) {
      break; // first garbage after real words = end of card name
    }
    // else: still before the first real word — skip this garbage token
  }
  return clean.join(' ');
}

module.exports = { extractText, parseFooter, parseCardName };
