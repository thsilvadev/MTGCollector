/**
 * Scan controller — 3-tier card identification from a camera frame.
 *
 * Tier 1: OCR the footer strip → set code + collector number → exact Scryfall lookup
 * Tier 2: OCR the name strip  → multilingual Scryfall search + fuzzy fallback
 * Tier 3: aHash the set icon  → closest sets (suggestion only, not confirmed card)
 *
 * POST /scan
 *   Body: multipart/form-data, field `frame` (JPEG/PNG image)
 *   Returns: { tier: 1|2|3, candidates: Card[], warnings: string[] }
 */

const multer = require('multer');
const sharp  = require('sharp');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

const { extractText, parseFooter, parseCardName } = require('../services/ocrService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }, // 15 MB max
});

const SCRYFALL_BASE = 'https://api.scryfall.com';
const HEADERS = { 'User-Agent': 'mtgchest/1.0', 'Accept': 'application/json' };

// Debug image output — set DEBUG_OCR=1 to save preprocessed strips to Backend/data/debug/
const DEBUG_OCR = process.env.DEBUG_OCR === '1';
const DEBUG_DIR = path.join(__dirname, '../../data/debug');

async function saveDebug(buffer, label) {
  if (!DEBUG_OCR) return;
  try {
    if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
    const file = path.join(DEBUG_DIR, `${Date.now()}_${label}.png`);
    await sharp(buffer).png().toFile(file);
    console.log(`[Scan] Debug saved: data/debug/${path.basename(file)}`);
  } catch { /* ignore */ }
}

// ── Scryfall helpers ───────────────────────────────────────────────────────────

async function getCardByCollector(setCode, collectorNumber) {
  try {
    const { data } = await axios.get(
      `${SCRYFALL_BASE}/cards/${setCode}/${collectorNumber}`,
      { headers: HEADERS },
    );
    return data;
  } catch {
    return null;
  }
}

/**
 * Identify card by name (any language) and return up to 5 printings.
 * Step 1: /cards/named?fuzzy=name — handles PT names, typos, any language.
 * Step 2: /cards/search?q=oracleid:X — all printings of that exact card.
 */
async function searchByName(name) {
  try {
    // Step 1: fuzzy name match (works with Portuguese names like "Ilha")
    const { data: canonical } = await axios.get(`${SCRYFALL_BASE}/cards/named`, {
      headers: HEADERS,
      params: { fuzzy: name },
    });
    if (!canonical?.oracle_id) return [];
    console.log(`[Scan] fuzzy named → "${canonical.name}" (oracle: ${canonical.oracle_id})`);

    // Step 2: all prints of this oracle card
    const { data: prints } = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
      headers: HEADERS,
      params: {
        q:      `oracleid:${canonical.oracle_id}`,
        unique: 'prints',
        order:  'released',
        dir:    'desc',
      },
    });
    return prints.data?.slice(0, 5) || [];
  } catch {
    return [];
  }
}

// ── Main scan handler ──────────────────────────────────────────────────────────

async function scan(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No frame provided.' });
  }

  const imageBuffer = req.file.buffer;
  const warnings    = [];
  let candidates    = [];
  let tier          = null;

  try {
    const meta = await sharp(imageBuffer).metadata();
    console.log(`[Scan] Image received: ${meta.width}x${meta.height}`);

    // Save the raw incoming card crop for inspection
    await saveDebug(imageBuffer, '0_raw_card');

    // ── Tier 1: OCR footer ──────────────────────────────────────────────────
    // Footer: bottom 15% of card, 4x upscale, normalize only (no threshold).
    // Similarly try PSM 7 and PSM 13.
    const footerH = Math.floor(meta.height * 0.15);
    const footerBuf = await sharp(imageBuffer)
      .extract({ left: 0, top: meta.height - footerH, width: meta.width, height: footerH })
      .resize({ width: Math.floor(meta.width * 4) })
      .grayscale()
      .normalize()
      .toBuffer();

    await saveDebug(footerBuf, '1_footer_normalize');

    const fOcr7  = await extractText(footerBuf, { psm: 7,  whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.- ' });
    const fOcr13 = await extractText(footerBuf, { psm: 13, whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.- ' });
    console.log('[Scan] Tier 1 PSM7=%s PSM13=%s', JSON.stringify(fOcr7.trim()), JSON.stringify(fOcr13.trim()));
    // Use whichever parses as a valid footer (setCode found)
    let footerText = fOcr7;
    if (!parseFooter(fOcr7) && parseFooter(fOcr13)) footerText = fOcr13;
    console.log('[Scan] Tier 1 OCR footer text:', JSON.stringify(footerText.trim()));

    const footerData = parseFooter(footerText);
    console.log('[Scan] Tier 1 parsed footer:', footerData);

    if (footerData) {
      console.log(`[Scan] Tier 1 Scryfall lookup: /cards/${footerData.setCode}/${footerData.collectorNumber}`);
      const card = await getCardByCollector(footerData.setCode, footerData.collectorNumber);
      console.log('[Scan] Tier 1 result:', card ? `✓ ${card.name} (${card.set} #${card.collector_number})` : '✗ not found');
      if (card) {
        tier       = 1;
        candidates = [card];
      }
    }

    // ── Tier 2: OCR name ────────────────────────────────────────────────────
    // Crop the top ~12% of the image where the card name lives.
    if (!candidates.length) {
      // Name bar: top ~7-14% of card height. Take 18% for tolerance.
      // Try multiple preprocessings and use the one with most characters.
      const nameH = Math.floor(meta.height * 0.18);
      const nameCrop = await sharp(imageBuffer)
        .extract({ left: 0, top: 0, width: meta.width, height: nameH })
        .resize({ width: Math.floor(meta.width * 4) })  // 4x for better OCR resolution
        .grayscale()
        .toBuffer();

      const nameBufA = await sharp(nameCrop).toBuffer();              // plain grayscale
      const nameBufB = await sharp(nameCrop).normalize().toBuffer();  // + normalize
      const nameBufC = await sharp(nameCrop).normalize().sharpen({ sigma: 1.5 }).toBuffer(); // + sharpen

      await saveDebug(nameBufA, '2_name_plain');
      await saveDebug(nameBufB, '2_name_normalize');
      await saveDebug(nameBufC, '2_name_normalize_sharpen');

      const ocr2A = await extractText(nameBufA, { psm: 7 });
      const ocr2B = await extractText(nameBufB, { psm: 7 });
      const ocr2C = await extractText(nameBufC, { psm: 7 });
      console.log('[Scan] Tier 2 OCR pipelines: plain=%s normalize=%s sharpen=%s',
        JSON.stringify(ocr2A.trim()), JSON.stringify(ocr2B.trim()), JSON.stringify(ocr2C.trim()));

      // Pick the result with the most real letters
      const countLetters = s => (s.match(/[a-zA-ZÀ-öø-ÿ]/g) || []).length;
      const nameText = [ocr2A, ocr2B, ocr2C].reduce((best, cur) =>
        countLetters(cur) > countLetters(best) ? cur : best
      );
      console.log('[Scan] Tier 2 OCR name text (best):', JSON.stringify(nameText.trim()));

      const cardName = parseCardName(nameText);
      console.log('[Scan] Tier 2 parsed name:', JSON.stringify(cardName));

      // Reject OCR noise: must contain at least one real word (3+ consecutive letters)
      const looksReal = cardName.length > 3 && /[a-zA-ZÀ-öø-ÿ]{3,}/.test(cardName);
      if (looksReal) {
        console.log(`[Scan] Tier 2 Scryfall search: "${cardName}"`);
        let results = await searchByName(cardName);

        // If fuzzy failed, retry with first 2 words only (covers OCR trailing noise)
        if (!results.length && cardName.split(' ').length > 2) {
          const shorter = cardName.split(' ').slice(0, 2).join(' ');
          console.log(`[Scan] Tier 2 retry with: "${shorter}"`);
          results = await searchByName(shorter);
        }

        if (results.length) {
          console.log(`[Scan] Tier 2 found ${results.length} result(s): ${results.map(c => c.name).join(', ')}`);
        } else {
          console.log('[Scan] Tier 2 search returned nothing');
        }

        if (results.length) {
          tier       = 2;
          candidates = results;
        }
      } else {
        console.log(`[Scan] Tier 2 rejected OCR noise: "${cardName}" (no real word found)`);
      }
    }

    // ── Tier 3: Set icon pHash ──────────────────────────────────────────────
    // Crop the set symbol region (lower-left area of the card art).
    if (!candidates.length) {
      try {
        const { findSetByIcon } = require('../services/iconService');

        const iconW = Math.floor(meta.width  * 0.12);
        const iconH = Math.floor(meta.height * 0.08);
        const iconBuffer = await sharp(imageBuffer)
          .extract({
            left:   Math.floor(meta.width  * 0.04),
            top:    Math.floor(meta.height * 0.78),
            width:  iconW,
            height: iconH,
          })
          .toBuffer();

        const topSets = await findSetByIcon(iconBuffer);
        tier       = 3;
        candidates = topSets.map(s => ({
          _setGuess:       true,
          set:             s.setCode,
          set_name:        s.name,
          iconConfidence:  s.distance,
        }));
        warnings.push(
          `Set identified by icon (Tier 3) — ${topSets.map(s => s.setCode).join(', ')}`,
        );
      } catch (iconErr) {
        warnings.push('Tier 3 unavailable — run: npm run build-icons');
      }
    }

    if (!candidates.length) {
      console.log('[Scan] All tiers exhausted — 404');
      return res.status(404).json({
        error:       'Card not identified.',
        suggestions: ['Improve lighting', 'Hold card steady', 'Move camera closer'],
      });
    }
    console.log(`[Scan] Returning tier ${tier}, ${candidates.length} candidate(s)`);


    return res.json({ tier, candidates, warnings });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Failed to process image.' });
  }
}

module.exports = { upload: upload.single('frame'), scan };
