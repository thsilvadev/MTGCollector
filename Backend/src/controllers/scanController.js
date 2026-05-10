const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const { sfGet } = require('../utils/scryfall');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },
});

const PYTHON_URL = process.env.PYTHON_OCR_URL || 'http://localhost:8001';
const SCRYFALL   = 'https://api.scryfall.com';

// ── Scryfall response cache ────────────────────────────────────────────────────
// Scryfall recommends caching for at least 24 hours to avoid rate-limit issues.
// Key: lowercased card name  Value: { data, expires }
const SF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const scryfallCache   = new Map();

function cacheGet(name) {
  const entry = scryfallCache.get(name);
  if (!entry) return null;
  if (Date.now() > entry.expires) { scryfallCache.delete(name); return null; }
  return entry.data;
}

function cacheSet(name, data) {
  scryfallCache.set(name, { data, expires: Date.now() + SF_CACHE_TTL_MS });
}
// All Scryfall HTTP calls go through sfGet() imported from scryfall.js,
// which holds the single global rate-limit queue (550ms between requests).

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
    const { data } = await axios.get(url, { headers: SF_HEADERS });
    return res.json({
      candidates: data.data     || [],
      nextPage:   data.has_more ? data.next_page : null,
    });
  } catch (err) {
    console.error('Scan/more error:', err);
    return res.status(500).json({ error: 'Failed to fetch next page.' });
  }
}

async function scan(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No frame received.' });

  try {
    // 1. Send frame to Python OCR microservice
    const form = new FormData();
    form.append('frame', req.file.buffer, {
      filename:    'frame.png',
      contentType: req.file.mimetype || 'image/png',
    });

    const pyRes = await axios.post(`${PYTHON_URL}/process`, form, {
      headers:          form.getHeaders(),
      timeout:          25000,
      maxContentLength: Infinity,
    });

    const py = pyRes.data;
    console.log(`[Scan] Python: found=${py.found} name="${py.name || '-'}" conf=${py.confidence ?? '-'}`);

    if (!py.found) {
      // Return 200 so the frontend can read the polygon for border feedback.
      return res.status(200).json({ found: false, candidates: [], polygon: py.polygon || null });
    }

    // Strip trailing non-letter garbage (stray symbols from OCR reading mana cost / set icons)
    // e.g. "Assimilador de Ventos Etereos @" → "Assimilador de Ventos Etereos"
    const cleanName = (py.name || '')
      .replace(/[^a-zA-ZÀ-ÿ'',\-\s]+$/, '')  // remove trailing non-name chars
      .replace(/\s+/g, ' ')                    // collapse multiple spaces
      .trim();

    console.log(`[Scan] Cleaned name: "${cleanName}"`);

    // Discard single-char / two-char garbage (partial reads from noise)
    if (!cleanName || cleanName.length < 3) {
      return res.status(200).json({ found: false, candidates: [], polygon: py.polygon || null });
    }

    // 2. Search Scryfall by extracted name — cache first, then exact, then fuzzy
    const cacheKey = cleanName.toLowerCase();
    const cached = cacheGet(cacheKey);
    if (cached) {
      console.log(`[Scan] Cache hit for "${cleanName}" — skipping Scryfall request`);
      return res.json({ ...cached, polygon: py.polygon });
    }

    let sfRes;
    try {
      console.log(`[Scan] Scryfall exact search: "${cleanName}"`);
      sfRes = await sfGet(`${SCRYFALL}/cards/search`, {
        q:                    `!"${cleanName}"`,
        include_multilingual: true,
        unique:               'prints',
        order:                'released',
        dir:                  'desc',
      });
      console.log(`[Scan] Scryfall exact hit: ${sfRes.data?.total_cards ?? 0} result(s)`);
    } catch (sfErr) {
      if (sfErr.response?.status === 404) {
        console.log(`[Scan] Scryfall exact miss for "${cleanName}" — trying fuzzy`);
        try {
          const fuzzy = await sfGet(`${SCRYFALL}/cards/named`, { fuzzy: cleanName });
          console.log(`[Scan] Fuzzy hit: "${fuzzy.data.name}"`);
          const payload = {
            found:       true,
            candidates:  [fuzzy.data],
            nextPage:    null,
            ocrFragment: fuzzy.data.name,
            confidence:  py.confidence,
          };
          cacheSet(cacheKey, payload);
          return res.json({ ...payload, polygon: py.polygon });
        } catch (fuzzyErr) {
          console.log(`[Scan] Fuzzy miss: ${fuzzyErr.response?.status ?? fuzzyErr.message}`);
          return res.status(200).json({ found: false, candidates: [], polygon: py.polygon || null });
        }
      }
      console.error(`[Scan] Scryfall error ${sfErr.response?.status ?? sfErr.code}: ${sfErr.message}`);
      throw sfErr;
    }

    const cards = sfRes.data?.data || [];
    if (!cards.length) {
      return res.status(200).json({ found: false, candidates: [], polygon: py.polygon || null });
    }

    console.log(`[Scan] Returning ${cards.length} candidate(s) for "${cleanName}"`);
    const payload = {
      found:       true,
      candidates:  cards,
      nextPage:    sfRes.data?.has_more ? sfRes.data.next_page : null,
      ocrFragment: cleanName,
      confidence:  py.confidence,
    };
    cacheSet(cacheKey, payload);
    return res.json({ ...payload, polygon: py.polygon });

  } catch (err) {
    console.error('[Scan] Error:', err.message);
    return res.status(500).json({ error: 'Internal error.' });
  }
}

async function detect(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No frame received.' });
  try {
    const form = new FormData();
    form.append('frame', req.file.buffer, {
      filename:    'frame.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });
    const pyRes = await axios.post(`${PYTHON_URL}/detect`, form, {
      headers:          form.getHeaders(),
      timeout:          5000,
      maxContentLength: Infinity,
    });
    const result = pyRes.data;
    if (result?.detected) {
      console.log(`[Detect] Card detected — polygon=${JSON.stringify(result.polygon)}`);
    }
    return res.json(result);
  } catch (err) {
    console.warn(`[Detect] Failed: ${err.message}`);
    return res.json({ detected: false });
  }
}

module.exports = { upload: upload.single('frame'), scan, more, detect };
