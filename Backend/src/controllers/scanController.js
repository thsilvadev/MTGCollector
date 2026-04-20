/**
 * Scan controller — name-only card identification.
 *
 * The frontend crops the camera frame to the card name strip (a horizontal
 * reticle). This controller OCRs that strip, fuzzy-matches the name against
 * Scryfall, and returns up to 20 printings for the user to choose from.
 *
 * POST /scan
 *   Body: multipart/form-data, field `frame` (PNG image — the name strip)
 *   Returns: { candidates: Card[], warnings: string[] }
 */

const multer = require('multer');
const sharp  = require('sharp');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

const { extractAll, parseCardName, findClosestCardName, findClosestWord } = require('../services/ocrService');
const knex = require('../database/index');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },
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

// ── Scryfall ───────────────────────────────────────────────────────────────────

/**
 * Fuzzy-match a card name (any language) and return the first page of printings.
 * Step 1: /cards/named?fuzzy  — resolves PT name → canonical english oracle id
 * Step 2: /cards/search?q=oracleid:X unique:prints — first page (up to 175)
 * Returns { cards, nextPage } where nextPage is a Scryfall URL or null.
 */
async function searchByName(name) {
  try {
    const { data: canonical } = await axios.get(`${SCRYFALL_BASE}/cards/named`, {
      headers: HEADERS,
      params: { fuzzy: name },
    });
    if (!canonical?.oracle_id) return { cards: [], nextPage: null };
    console.log(`[Scan] fuzzy named → "${canonical.name}" (oracle: ${canonical.oracle_id})`);

    const { data: prints } = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
      headers: HEADERS,
      params: {
        q:      `oracleid:${canonical.oracle_id}`,
        unique: 'prints',
        order:  'set',
        dir:    'asc',
      },
    });
    return {
      cards:    prints.data     || [],
      nextPage: prints.has_more ? prints.next_page : null,
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status !== 404) console.warn(`[Scan] searchByName("${name}") error: HTTP ${status ?? err.message}`);
    return { cards: [], nextPage: null };
  }
}

/**
 * Search for a card by its full Portuguese name, with progressive strip-and-retry.
 * Handles leading noise (e.g. "RT Kami da Pedra Velha") and trailing noise
 * (e.g. "cacadora Celeste ont HER" where "ont HER" is card-art bleed).
 *
 * Order of attempts (fewest total strips first; within equal total, right before left
 * because trailing OCR noise is more common than leading noise):
 *   (L=0,R=0) → (L=0,R=1) → (L=0,R=1)→(L=1,R=0) → (L=0,R=2)→(L=1,R=1)→(L=2,R=0) …
 */
async function searchByNamePT(name) {
  const words = name.split(' ');
  if (words.length < 2) return { cards: [], nextPage: null };

  const maxStrip = Math.min(2, words.length - 2);

  // Build ordered list of (left, right) strip pairs, fewest total strips first.
  // Within the same total, prefer right-stripping (trailing noise is more common).
  const attempts = [];
  for (let total = 0; total <= maxStrip * 2; total++) {
    for (let r = Math.min(total, maxStrip); r >= 0; r--) {
      const l = total - r;
      if (l > maxStrip) continue;
      const end   = words.length - r || undefined;
      const slice = words.slice(l, end);
      if (slice.length >= 2) attempts.push(slice.join(' '));
    }
  }
  const seen = new Set();
  const phrases = attempts.filter(p => !seen.has(p) && seen.add(p));

  for (const phrase of phrases) {
    try {
      const { data } = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
        headers: HEADERS,
        params: {
          q:      `name:"${phrase}" lang:pt game:paper`,
          unique: 'prints',
          order:  'set',
          dir:    'asc',
        },
      });
      if (data.data?.length) {
        console.log(`[Scan] PT phrase "${phrase}" → ${data.data.length} result(s)`);
        return { cards: data.data, nextPage: data.has_more ? data.next_page : null };
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 404) console.warn(`[Scan] searchByNamePT("${phrase}") error: HTTP ${status ?? err.message}`);
    }
  }
  return { cards: [], nextPage: null };
}

/**
 * GET /scan/more?url=<scryfall_next_page_url>
 * Proxy a Scryfall pagination URL and return the next batch of cards.
 */
async function more(req, res) {
  const url = req.query.url;
  if (!url || !url.startsWith('https://api.scryfall.com/')) {
    return res.status(400).json({ error: 'Invalid URL.' });
  }
  try {
    const { data } = await axios.get(url, { headers: HEADERS });
    return res.json({
      candidates: data.data     || [],
      nextPage:   data.has_more ? data.next_page : null,
    });
  } catch (err) {
    console.error('Scan/more error:', err);
    return res.status(500).json({ error: 'Failed to fetch next page.' });
  }
}

// ── Main scan handler ──────────────────────────────────────────────────────────

async function scan(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No frame provided.' });
  }

  const imageBuffer = req.file.buffer;
  const warnings    = [];

  try {
    const meta = await sharp(imageBuffer).metadata();
    console.log(`[Scan] Name strip received: ${meta.width}x${meta.height}`);

    await saveDebug(imageBuffer, '0_raw_strip');

    // ── Preprocess: 3 focused pipelines ──────────────────────────────────
    //
    // Pipeline 1 — full strip, normalized, PSM 7 (single line)
    //   Best for long multi-word names ("Invocador do Coração Selvagem").
    //
    // Pipelines 2 & 3 — left 65% crop, PSM 7 (normalized) and PSM 13 (sharpen+binarized).
    //   PSM 13 = "raw line" mode: bypasses Tesseract's internal hacks, works better
    //   for decorative/old-frame fonts (Matrix Bold) that confuse connected-component
    //   analysis. sharpen() makes thin serif strokes crisper before binarizing.
    //   Threshold 120 (vs 140) catches thinner strokes that normalize leaves as midgray.
    //
    // Pipeline 4 — center crop (13%-78%): starts at 13% to not clip the first letter
    //   when the card is centered in the reticle; also sharpened+binarized+PSM 13.
    //
    const base = await sharp(imageBuffer)
      .resize({ width: meta.width * 4 })
      .grayscale()
      .toBuffer();

    const { width: baseW, height: baseH } = await sharp(base).metadata();
    const leftCrop   = { left: 0,                         top: 0, width: Math.floor(baseW * 0.65), height: baseH };
    const centerCrop = { left: Math.floor(baseW * 0.13), top: 0, width: Math.floor(baseW * 0.65), height: baseH };

    const bufFull   = await sharp(base).normalize().toBuffer();
    const bufLeft7  = await sharp(base).extract(leftCrop).normalize().toBuffer();
    const bufLeft13 = await sharp(base).extract(leftCrop).normalize().sharpen().threshold(120).toBuffer();
    const bufCenter = await sharp(base).extract(centerCrop).normalize().sharpen().threshold(120).toBuffer();

    await saveDebug(bufFull,   '1_full_norm');
    await saveDebug(bufLeft7,  '2_left_norm');
    await saveDebug(bufLeft13, '3_left_bin13');
    await saveDebug(bufCenter, '4_center_bin13');

    // All four pipelines run in parallel — one Tesseract worker each.
    const [ocrFull, ocrLeft7, ocrLeft13, ocrCenter] = await extractAll(bufFull, bufLeft7, bufLeft13, bufCenter);

    console.log('[Scan] OCR full=%s left7=%s left13=%s center=%s',
      JSON.stringify(ocrFull.trim()),
      JSON.stringify(ocrLeft7.trim()),
      JSON.stringify(ocrLeft13.trim()),
      JSON.stringify(ocrCenter.trim()));

    // Parse each result and build a ranked list of unique candidate names to try.
    // Sort by letter count desc; dedup so equal names are only tried once.
    const countLetters = s => (s.match(/[a-zA-Z\u00C0-\u00F6\u00F8-\u00FF]/g) || []).length;
    const rawNames = [ocrFull, ocrLeft7, ocrLeft13, ocrCenter].map(parseCardName);
    console.log('[Scan] Parsed names: full=%s left7=%s left13=%s center=%s',
      JSON.stringify(rawNames[0]), JSON.stringify(rawNames[1]), JSON.stringify(rawNames[2]), JSON.stringify(rawNames[3]));

    // Unique names, sorted best-first; reject pure noise (no real 3+ letter word)
    const isReal = s => s.length > 2 && /[a-zA-Z\u00C0-\u00F6\u00F8-\u00FF]{3,}/.test(s);
    const seen   = new Set();
    const namesToTry = rawNames
      .filter(n => isReal(n) && !seen.has(n) && seen.add(n))
      .sort((a, b) => countLetters(b) - countLetters(a));

    if (!namesToTry.length) {
      console.log('[Scan] Rejected OCR noise — all pipelines produced garbage');
      return res.status(404).json({ error: 'Card name not readable — hold the name strip steady.' });
    }

    // For each unique full name, also interleave shortened variants right after
    // their parent so they're tried before unrelated names from other pipelines.
    // e.g. "MB centaura-caçadora" → insert "centaura-caçadora" immediately after,
    // before "BEAR" from another pipeline gets a chance to match first.
    //
    // Single words DERIVED from multi-word names are NOT added to allNames (fuzzy).
    // Single-word fuzzy is too liberal — "Polvo" alone fuzzy-matches "Grind // Dust"
    // because its PT name is "Polvo e Pó". These words go to the lang:pt substring
    // fallback instead, where they correctly find all PT cards containing that word.
    const allNames = [];
    const derivedSingleWords = [];   // will be prepended to substring fallback
    for (const n of namesToTry) {
      allNames.push(n);
      const words = n.split(' ');
      if (words.length > 2) {
        const first2 = words.slice(0, 2).join(' ');
        if (isReal(first2) && !seen.has(first2)) { seen.add(first2); allNames.push(first2); }
      }
      if (words.length > 1) {
        // word derived from a multi-word name → lang:pt only, skip fuzzy
        const longWords = words.filter(w => w.length >= 4).sort((a, b) => b.length - a.length);
        if (longWords.length && !seen.has(longWords[0])) {
          seen.add(longWords[0]);
          derivedSingleWords.push(longWords[0]);
        }
      }
    }

    // Edit-distance snap: for each parsed OCR name, find the closest real card
    // name in the local list. This catches font-specific misreads like
    // "Iha" → "Ilha" (Tesseract drops the 'l' in the Beleren serif font).
    // Restricted to 3-char single words where false-positive risk is low.
    // Matched names are prepended so they're tried before the raw OCR noise.
    const edMatches = [];
    for (const ocrName of rawNames.filter(n => n.length === 3 && !/\s/.test(n) && !/^[A-Z]+$/.test(n))) {
      // Skip all-uppercase tokens — they're OCR noise (TER, ITE, IIP), not partial names.
      const closest = findClosestCardName(ocrName);
      if (closest && !seen.has(closest)) {
        seen.add(closest);
        edMatches.push(closest);
        console.log(`[Scan] Edit-distance: "${ocrName}" → "${closest}"`);
      }
    }
    allNames.push(...edMatches);

    console.log('[Scan] Will try names:', allNames.map(n => JSON.stringify(n)).join(', '));

    // ── Scan cache lookup ──────────────────────────────────────────────────────
    // If any fragment in our candidate list was confirmed ≥2 times before,
    // skip the Scryfall waterfall entirely and go straight to the oracle_id.
    let matchedFragment = null;
    let candidates = [];
    let nextPage   = null;

    try {
      const cacheHit = await knex('scan_cache')
        .whereIn('fragment', allNames.slice(0, 8))
        .where('hits', '>=', 2)
        .orderBy('hits', 'desc')
        .first();

      if (cacheHit) {
        console.log(`[Scan] Cache HIT: "${cacheHit.fragment}" → oracle ${cacheHit.oracle_id} (hits: ${cacheHit.hits})`);
        try {
          const { data: prints } = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
            headers: HEADERS,
            params: { q: `oracleid:${cacheHit.oracle_id}`, unique: 'prints', order: 'set', dir: 'asc' },
          });
          if (prints.data?.length) {
            console.log(`[Scan] Cache served ${prints.data.length} printing(s)`);
            return res.json({
              candidates:  prints.data,
              nextPage:    prints.has_more ? prints.next_page : null,
              warnings,
              ocrFragment: cacheHit.fragment,
              oracleId:    cacheHit.oracle_id,
            });
          }
        } catch {
          // Stale oracle_id or Scryfall error — fall through to normal waterfall
          console.warn('[Scan] Cache hit but Scryfall fetch failed — falling through to waterfall');
        }
      }
    } catch (err) {
      console.warn('[Scan] Cache lookup failed:', err.message);
    }

    // ── Waterfall search ───────────────────────────────────────────────────────
    // For multi-word names: try PT phrase search FIRST (catches Portuguese card
    // names before Scryfall's English-biased fuzzy returns the wrong card).
    // Then fall back to English fuzzy if PT found nothing.
    for (const name of allNames) {
      let result = { cards: [], nextPage: null };

      if (name.split(' ').length >= 2) {
        result = await searchByNamePT(name);
      }

      if (!result.cards.length) {
        console.log(`[Scan] Searching: "${name}"`);
        result = await searchByName(name);
      }

      if (result.cards.length) {
        candidates    = result.cards;
        nextPage      = result.nextPage;
        matchedFragment = name;
        break;
      }
    }

    // Last-resort: substring search in Portuguese.
    // Handles cases where OCR gets a partial name (e.g. "Invocador") whose
    // fuzzy-named match fails — name:word finds any PT card containing that word.
    // derivedSingleWords (e.g. "Polvo" from "Polvo Sioa") are prepended so they
    // run before the raw OCR fragments.
    if (!candidates.length) {
      // Include allNames (not just rawNames) so that edit-distance corrections
      // like "Ilha" (derived from "Iha") reach the lang:pt fallback even when
      // the raw OCR fragments are all short ("Iha", "ITE", "IIP" = 3 chars each).
      const rawWords = [...new Set([
        ...derivedSingleWords,
        ...allNames.flatMap(n => n.split(' ').filter(w => w.length >= 4)),
      ])];

      // Word-level edit-distance correction: snap garbled long OCR words to the
      // nearest real card-vocabulary word before querying Scryfall.
      // e.g. "Postcionadas" (edit dist 1) → "Posicionadas"
      //      → name:Posicionadas lang:pt → finds "Tropas Posicionadas".
      // Scryfall uses exact substring matching on name:, so a single-character
      // corruption in a 12-letter word causes a guaranteed miss without this step.
      const wordCorrectionSeen = new Set(rawWords.map(w => w.toLowerCase()));
      const correctedWords = [];
      for (const w of rawWords.filter(w => w.length >= 6)) {
        const corrected = findClosestWord(w);
        if (corrected && !wordCorrectionSeen.has(corrected.toLowerCase())) {
          wordCorrectionSeen.add(corrected.toLowerCase());
          correctedWords.push(corrected);
          console.log(`[Scan] Word correction: "${w}" → "${corrected}"`);
        }
      }

      // Corrected words go first (more likely to be right), then raw OCR words,
      // all sorted longest-first (longer = more specific = less noise from Scryfall).
      const substringWords = [
        ...correctedWords.sort((a, b) => b.length - a.length),
        ...rawWords.sort((a, b) => b.length - a.length),
      ];

      for (const word of substringWords) {
        console.log(`[Scan] Substring fallback (lang:pt name:"${word}")`);
        try {
          const { data } = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
            headers: HEADERS,
            params: {
              q:      `name:${word} lang:pt game:paper`,
              unique: 'prints',
              order:  'released',
              dir:    'desc',
            },
          });
          if (data.data?.length) {
            candidates      = data.data;
            nextPage        = data.has_more ? data.next_page : null;
            matchedFragment = word;
            console.log(`[Scan] Substring fallback found ${candidates.length} result(s)`);
            break;
          }
        } catch { /* word not found, try next */ }
      }
    }

    if (!candidates.length) {
      console.log('[Scan] No results found');
      return res.status(404).json({ error: 'Card not found — try again with better lighting.' });
    }

    console.log(`[Scan] Found ${candidates.length} printing(s)${nextPage ? ' (more available)' : ''}: ${candidates.map(c => c.name)[0]}...`);
    return res.json({
      candidates,
      nextPage,
      warnings,
      ocrFragment: matchedFragment,
      oracleId:    candidates[0]?.oracle_id ?? null,
    });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Failed to process image.' });
  }
}

module.exports = { upload: upload.single('frame'), scan, more };
