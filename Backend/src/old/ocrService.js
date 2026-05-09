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

// Pool of 4 persistent workers — one per OCR pipeline.
// Running them in parallel cuts wall-clock OCR time by ~3/4 vs a single worker
// that must handle each pipeline sequentially.
// Workers are created once on first use and reused across all requests.
// OEM 1 = LSTM only (best for decorative/display fonts like MTG Beleren).
const LANG_PATH = path.join(__dirname, '../..');
const POOL_SIZE = 4;
let   pool      = null;  // Promise<Worker[]>

async function getPool() {
  if (!pool) {
    pool = Promise.all(
      Array.from({ length: POOL_SIZE }, () =>
        Tesseract.createWorker(['eng', 'por'], 1, { langPath: LANG_PATH })
      )
    );
  }
  return pool;
}

/**
 * Extract text from an image buffer using the given worker.
 * @param {Worker} worker
 * @param {Buffer} imageBuffer
 * @param {{ psm?: number }} [options]
 * @returns {Promise<string>}
 */
async function extractWith(worker, imageBuffer, options = {}) {
  const { psm = 7 } = options;
  await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
  const { data: { text } } = await worker.recognize(imageBuffer);
  return text;
}

/**
 * Run all four OCR pipelines in parallel.
 * @param {Buffer} bufFull    — full-strip normalized image (PSM 7)
 * @param {Buffer} bufLeft7   — left-65%-crop normalized image (PSM 7)
 * @param {Buffer} bufLeft13  — left-65%-crop sharpen+binarized image (PSM 13)
 * @param {Buffer} bufCenter  — center-crop (13–78%) sharpen+binarized image (PSM 13)
 * @returns {Promise<[string, string, string, string]>}
 */
async function extractAll(bufFull, bufLeft7, bufLeft13, bufCenter) {
  const workers = await getPool();
  return Promise.all([
    extractWith(workers[0], bufFull,   { psm: 7  }),
    extractWith(workers[1], bufLeft7,  { psm: 7  }),
    extractWith(workers[2], bufLeft13, { psm: 13 }),
    extractWith(workers[3], bufCenter, { psm: 13 }),
  ]);
}

// Keep the single-buffer extractText for any callers that still use it.
async function extractText(imageBuffer, options = {}) {
  const workers = await getPool();
  return extractWith(workers[0], imageBuffer, options);
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
  // Try each line; return the one that parses to the longest clean name.
  // Line 0 is sometimes pure garbage when the strip has leading border pixels.
  let bestLine = '';
  let bestLen  = 0;
  for (const l of lines) {
    const candidate = _parseLine(l);
    const len = (candidate.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
    if (len > bestLen) { bestLen = len; bestLine = l; }
  }
  const line = bestLine || lines[0] || '';
  // Letters only (including accented), apostrophes, and hyphens.
  // We skip leading garbage tokens (|, {, [, etc.) then collect consecutive
  // real-word tokens and stop at the first garbage token after we've started.
  return _parseLine(line);
}

function _parseLine(line) {
  // Normalize common OCR misreadings before tokenising.
  // The Beleren serifed capital 'I' is consistently misread as '|', '(' or '['.
  const norm = line.replace(/[|([\]]/g, 'I');
  const wordOnly = /^[a-zA-Z\u00C0-\u024F''-]{2,}$/;

  // Strip leading/trailing non-letter characters that OCR noise attaches to
  // words, e.g. "2uldado" (misread 'S') → "uldado", "Ik," → "Ik".
  // This keeps the letter-only core so the token doesn't break the run.
  const stripEdge = s =>
    s.replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, '');

  const tokens = norm.split(/\s+/).map(tok => {
    if (/^I+$/.test(tok)) return '?';           // all-I bracket artifact → sentinel
    const cleaned = stripEdge(tok);
    if (/^I+$/.test(cleaned)) return '?';       // e.g. "2III" → "III" → still noise
    // Strip leading bracket-artifact I's: "((cacadora" → "IIcacadora" → "cacadora",
    //                                       "((Gênio"    → "IIGênio"    → "Gênio".
    // Only strip when 2+ leading I's AND the remainder is ≥ 5 chars — this
    // protects "Ilha" (only 1 I) and short leftovers like "IIlha" (3 chars left).
    const debracketed = cleaned.replace(/^I{2,}(?=[a-zA-Z\u00C0-\u024F].{3,}$)/, '');
    return debracketed;
  });

  // Find the best consecutive run of clean word-tokens anywhere in the line.
  // Compare runs by TOTAL LETTER COUNT, not token count — this ensures a single
  // long merged word ("Eariasoltariano" = 15 letters) beats a short two-char
  // token ("IN" = 2 letters) that happens to appear first.
  const letterCount = run =>
    run.reduce((s, t) => s + (t.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length, 0);

  let bestRun = [];
  let currentRun = [];
  for (const tok of tokens) {
    if (wordOnly.test(tok)) {
      currentRun.push(tok);
    } else {
      if (letterCount(currentRun) > letterCount(bestRun)) bestRun = currentRun;
      currentRun = [];
    }
  }
  if (letterCount(currentRun) > letterCount(bestRun)) bestRun = currentRun;
  return bestRun.join(' ');
}

// ── Edit-distance matching ────────────────────────────────────────────────────
// Two separate dictionaries built lazily from card_names.json:
//
//   _cardNames  — full card name strings, used to snap short (≤3 char) raw
//                 OCR results to a real card name.  e.g. "Iha" → "Ilha".
//
//   _wordDict   — every individual word (≥5 chars) extracted from all card
//                 names.  Used to correct individual long OCR words before
//                 passing them to the Scryfall substring fallback.
//                 e.g. "Postcionadas" → "Posicionadas" (edit dist 1).
//
// Keeping them separate lets us tune thresholds independently: full-name
// matching must be tight (only 3-char tokens, dist ≤ 1) while word-level
// matching can be slightly more liberal (dist proportional to word length).

let _cardNames = null;
let _wordDict  = null;

function _loadCardNames() {
  if (_cardNames) return _cardNames;
  try {
    _cardNames = require(path.join(__dirname, '../data/card_names.json'));
  } catch (e) {
    console.warn('[OCR] card_names.json not found — edit-distance lookup disabled');
    _cardNames = [];
  }
  return _cardNames;
}

function _loadWordDict() {
  if (_wordDict) return _wordDict;
  const names = _loadCardNames();
  // Extract every word ≥ 5 chars from all card names, preserving original casing
  // (we need the cased form to pass to Scryfall) but dedup case-insensitively.
  const seenLower = new Set();
  const words = [];
  for (const name of names) {
    for (const raw of name.split(/[\s\-\/]+/)) {
      const w = raw.replace(/[^a-zA-Z\u00C0-\u024F]/g, '');
      if (w.length < 5) continue;
      const lo = w.toLowerCase();
      if (!seenLower.has(lo)) { seenLower.add(lo); words.push(w); }
    }
  }
  _wordDict = words;
  return _wordDict;
}

function _levenshtein(a, b) {
  // Space-optimised O(m·n) DP. Returns early if current row min > maxDist.
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr.slice();
  }
  return prev[n];
}

/**
 * Find the closest card name in the local list to `ocrText`.
 * Returns the matched name if it is within the allowed edit distance,
 * or null if the match is ambiguous or too far.
 *
 * Threshold: 1 edit for names ≤ 5 chars, 2 for ≤ 9 chars, 3 for longer.
 */
function findClosestCardName(ocrText) {
  if (!ocrText || ocrText.length < 3) return null;
  const names = _loadCardNames();
  if (!names.length) return null;

  const maxDist = ocrText.length <= 5 ? 1 : ocrText.length <= 9 ? 2 : 3;
  const lo = ocrText.toLowerCase();

  let best = null, bestDist = maxDist + 1;
  for (const name of names) {
    if (Math.abs(name.length - ocrText.length) > maxDist) continue;
    const d = _levenshtein(lo, name.toLowerCase());
    if (d < bestDist) { bestDist = d; best = name; }
    if (bestDist === 0) break;
  }
  return bestDist <= maxDist ? best : null;
}

/**
 * Find the closest real card-vocabulary word to a single OCR word.
 * Used to correct long garbled tokens before Scryfall substring search.
 * e.g. "Postcionadas" → "Posicionadas" (edit dist 1).
 *
 * Only operates on words ≥ 6 chars to avoid false positives on short tokens.
 * Threshold: 1 edit for 6-7 chars, 2 for 8-10 chars, 3 for 11+ chars.
 * Returns null if no match within threshold, or if the best match is the
 * input itself (no correction needed).
 */
function findClosestWord(ocrWord) {
  if (!ocrWord || ocrWord.length < 6) return null;
  const dict = _loadWordDict();
  if (!dict.length) return null;

  const maxDist = ocrWord.length <= 7 ? 1 : ocrWord.length <= 10 ? 2 : 3;
  const lo = ocrWord.toLowerCase();

  let best = null, bestDist = maxDist + 1;
  for (const word of dict) {
    if (Math.abs(word.length - ocrWord.length) > maxDist) continue;
    const d = _levenshtein(lo, word.toLowerCase());
    if (d < bestDist) { bestDist = d; best = word; }
    if (bestDist === 0) break;
  }
  if (bestDist > maxDist || !best) return null;
  // Don't return the same word (case-insensitive) — no correction needed
  if (best.toLowerCase() === lo) return null;
  return best;
}

module.exports = { extractText, extractAll, parseCardName, findClosestCardName, findClosestWord };
