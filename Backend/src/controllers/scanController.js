const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },
});

const PYTHON_URL = process.env.PYTHON_OCR_URL || 'http://localhost:8001';
const SCRYFALL   = 'https://api.scryfall.com';
const SF_HEADERS = { 'User-Agent': 'mtgchest/1.0', 'Accept': 'application/json' };

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
      // Still forward the polygon so the frontend can show border feedback
      // even before a card name has been confirmed.
      return res.status(404).json({ found: false, polygon: py.polygon || null });
    }

    // Discard single-char / two-char garbage (partial reads from noise)
    if (!py.name || py.name.length < 3) {
      return res.status(404).json({ found: false, polygon: py.polygon || null });
    }

    // 2. Search Scryfall by extracted name — exact first, fuzzy as fallback
    let sfRes;
    try {
      sfRes = await axios.get(`${SCRYFALL}/cards/search`, {
        headers: SF_HEADERS,
        params: {
          q:                    `"${py.name}"`,
          include_multilingual: true,
          unique:               'prints',
          order:                'released',
          dir:                  'desc',
        },
        timeout: 12000,
      });
    } catch (sfErr) {
      if (sfErr.response?.status === 404) {
        console.log(`[Scan] Scryfall exact miss for "${py.name}" — trying fuzzy`);
        try {
          const fuzzy = await axios.get(`${SCRYFALL}/cards/named`, {
            headers: SF_HEADERS,
            params:  { fuzzy: py.name },
            timeout: 12000,
          });
          return res.json({
            found:       true,
            candidates:  [fuzzy.data],
            nextPage:    null,
            ocrFragment: fuzzy.data.name,
            confidence:  py.confidence,
            polygon:     py.polygon,
          });
        } catch {
          return res.status(404).json({ found: false });
        }
      }
      throw sfErr;
    }

    const cards = sfRes.data?.data || [];
    if (!cards.length) {
      return res.status(404).json({ found: false });
    }

    return res.json({
      found:       true,
      candidates:  cards,
      nextPage:    sfRes.data?.has_more ? sfRes.data.next_page : null,
      ocrFragment: py.name,
      confidence:  py.confidence,
      polygon:     py.polygon,
    });

  } catch (err) {
    console.error('[Scan] Error:', err.message);
    return res.status(500).json({ error: 'Internal error.' });
  }
}

module.exports = { upload: upload.single('frame'), scan, more };
