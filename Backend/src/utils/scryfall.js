const axios = require('axios');

const SCRYFALL_BASE = 'https://api.scryfall.com';

const HEADERS = {
  'User-Agent': 'mtgchest/1.0',
  'Accept':     'application/json',
};

// ── Global Scryfall rate limiter ───────────────────────────────────────────────
// ALL Scryfall requests from the entire application must go through sfGet().
// This serialises requests into a single queue with a 550ms minimum gap,
// keeping us under the 2 req/s limit for /cards/search, /cards/named, /cards/collection.
// Both scanController and scryfall utils import this from here — one queue, one gate.
const SF_MIN_INTERVAL_MS = 550;
let _sfLastCall = 0;
let _sfQueue    = Promise.resolve();

function sfGet(url, params, extraConfig = {}) {
  _sfQueue = _sfQueue.then(async () => {
    const wait = SF_MIN_INTERVAL_MS - (Date.now() - _sfLastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _sfLastCall = Date.now();
  });
  return _sfQueue.then(async () => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await axios.get(url, { headers: HEADERS, params, timeout: 15000, ...extraConfig });
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn('[Scryfall] 429 rate-limit received — pausing 30s');
          await new Promise(r => setTimeout(r, 30000));
          throw err; // don't retry 429 — we need to back off
        }
        const retryable = !err.response && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED');
        if (retryable && attempt < MAX_ATTEMPTS) {
          const delay = attempt * 2000; // 2s, 4s
          console.warn(`[Scryfall] ${err.code} on attempt ${attempt}/${MAX_ATTEMPTS} — retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  });
}

function sfPost(url, body) {
  _sfQueue = _sfQueue.then(async () => {
    const wait = SF_MIN_INTERVAL_MS - (Date.now() - _sfLastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _sfLastCall = Date.now();
  });
  return _sfQueue.then(async () => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await axios.post(url, body, {
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          timeout: 15000,
        });
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn('[Scryfall] 429 rate-limit received — pausing 30s');
          await new Promise(r => setTimeout(r, 30000));
          throw err;
        }
        const retryable = !err.response && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED');
        if (retryable && attempt < MAX_ATTEMPTS) {
          const delay = attempt * 2000;
          console.warn(`[Scryfall] ${err.code} on attempt ${attempt}/${MAX_ATTEMPTS} — retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  });
}

const SUPERTYPES = new Set(['Basic', 'Legendary', 'Snow', 'World', 'Ongoing']);

/**
 * Normalize a Scryfall card object into the field shape the app expects.
 */
function normalizeCard(card) {
  const typePart  = (card.type_line || '').split('—')[0].trim();
  const typeWords = typePart.split(/\s+/).filter(Boolean);
  const supertypes = typeWords.filter(w =>  SUPERTYPES.has(w)).join(' ');
  const types      = typeWords.filter(w => !SUPERTYPES.has(w)).join(' ');

  return {
    id:            card.id,
    scryfallId:    card.id,
    name:          card.name,
    types,
    supertypes,
    setCode:       card.set,
    manaCost:      card.mana_cost   || '',
    manaValue:     card.cmc,
    rarity:        card.rarity,
    uuid:          card.oracle_id,
    colorIdentity: (card.color_identity || []).join(', '),
    keywords:      (card.keywords      || []).join(', '),
    multiverseId:  card.multiverse_ids?.[0] ?? null,
    layout:        card.layout,
    prices:        card.prices,
  };
}

/**
 * Resolve a card name (any language) to its canonical English name.
 * Returns the English name string if found, or null if not found / ambiguous.
 */
async function resolveCardName(name) {
  try {
    const res = await sfGet(`${SCRYFALL_BASE}/cards/named`, { fuzzy: name });
    return res.data.name;
  } catch {
    return null;
  }
}

async function searchCards(q, page = 1, opts = {}) {
  const params = { q, page, order: 'name' };
  if (opts.includeMultilingual) params.include_multilingual = true;
  try {
    const res = await sfGet(`${SCRYFALL_BASE}/cards/search`, params);
    return {
      data:        res.data.data.map(normalizeCard),
      has_more:    res.data.has_more,
      total_cards: res.data.total_cards,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { data: [], has_more: false, total_cards: 0 };
    }
    throw err;
  }
}

async function batchGetCards(scryfallIds) {
  if (!scryfallIds || !scryfallIds.length) return [];

  const results = [];
  for (let i = 0; i < scryfallIds.length; i += 75) {
    const chunk       = scryfallIds.slice(i, i + 75);
    const identifiers = chunk.map(id => ({ id }));
    try {
      const res = await sfPost(`${SCRYFALL_BASE}/cards/collection`, { identifiers });
      results.push(...res.data.data.map(normalizeCard));
    } catch (err) {
      console.error(`[Scryfall] batchGetCards chunk ${i}–${i + chunk.length} failed: ${err.code ?? err.message}`);
      // Partial failure: skip chunk, continue with remaining chunks
    }
  }
  return results;
}

async function getSets() {
  const res = await sfGet(`${SCRYFALL_BASE}/sets`);
  return res.data.data;
}

/**
 * Given a Scryfall oracle_id, find the best available USD price across all printings.
 * Strategy:
 *   1. Search English printings (lang:en) sorted newest-first — most likely to have USD pricing
 *   2. If none have a price, search all languages
 *   3. Returns a float or null if no price found anywhere
 */
async function findUsdPrice(oracleId) {
  // 1. Try English printings first
  try {
    const res = await sfGet(`${SCRYFALL_BASE}/cards/search`, {
      q:     `oracleid:${oracleId} lang:en`,
      order: 'released',
      dir:   'desc',
    });
    const found = res.data.data.find(c => c.prices?.usd != null);
    if (found) {
      console.log(`[Scryfall] findUsdPrice: EN hit — "${found.name}" (${found.set}) $${found.prices.usd}`);
      return parseFloat(found.prices.usd);
    }
    console.log(`[Scryfall] findUsdPrice: EN search returned ${res.data.data.length} card(s), none with USD price`);
  } catch (err) {
    if (err.response?.status !== 404) throw err;
    console.log(`[Scryfall] findUsdPrice: EN search 404 for oracle ${oracleId}`);
  }

  // 2. Fallback: any language
  try {
    const res = await sfGet(`${SCRYFALL_BASE}/cards/search`, {
      q:     `oracleid:${oracleId}`,
      order: 'released',
      dir:   'desc',
    });
    const found = res.data.data.find(c => c.prices?.usd != null);
    if (found) {
      console.log(`[Scryfall] findUsdPrice: any-lang hit — "${found.name}" (${found.set}, ${found.lang}) $${found.prices.usd}`);
      return parseFloat(found.prices.usd);
    }
    console.log(`[Scryfall] findUsdPrice: any-lang search returned ${res.data.data.length} card(s), none with USD price`);
  } catch (err) {
    if (err.response?.status !== 404) throw err;
    console.log(`[Scryfall] findUsdPrice: any-lang search 404 for oracle ${oracleId}`);
  }

  return null;
}

module.exports = { searchCards, batchGetCards, getSets, normalizeCard, resolveCardName, sfGet, findUsdPrice };
