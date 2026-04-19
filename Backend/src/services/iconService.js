/**
 * Set icon matching service — Tier 3 fallback.
 *
 * Uses an average-hash (aHash) computed with sharp only, no extra deps.
 * Requires the set icon index to be built first:
 *   npm run build-icons
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const INDEX_PATH = path.join(__dirname, '../../data/setIconIndex.json');
let index = null;

function loadIndex() {
  if (!index) {
    if (!fs.existsSync(INDEX_PATH)) {
      throw new Error('Set icon index not found. Run: npm run build-icons');
    }
    index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  return index;
}

/**
 * Compute an 8x8 average hash (aHash) string of '0'/'1' chars from an image buffer.
 * @param {Buffer} imageBuffer  — any format accepted by sharp
 * @returns {Promise<string>}   — 64-char binary string
 */
async function computeAHash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const avg = data.reduce((sum, p) => sum + p, 0) / data.length;
  return Array.from(data).map(p => (p >= avg ? '1' : '0')).join('');
}

/**
 * Hamming distance between two binary hash strings.
 */
function hammingDistance(h1, h2) {
  let dist = 0;
  const len = Math.min(h1.length, h2.length);
  for (let i = 0; i < len; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

/**
 * Given a buffer of the set icon region from a card photo,
 * returns the 3 most similar sets by aHash distance.
 *
 * @param {Buffer} iconBuffer
 * @returns {Promise<Array<{ setCode: string, name: string, distance: number }>>}
 */
async function findSetByIcon(iconBuffer) {
  const idx = loadIndex();

  // Normalize to same 64x64 grayscale+threshold that the index was built with
  const normalized = await sharp(iconBuffer)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .grayscale()
    .threshold(128)
    .png()
    .toBuffer();

  const queryHash = await computeAHash(normalized);

  const results = Object.entries(idx).map(([setCode, info]) => ({
    setCode,
    name: info.name,
    distance: hammingDistance(queryHash, info.ahash),
  }));

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, 3);
}

module.exports = { findSetByIcon, computeAHash };
