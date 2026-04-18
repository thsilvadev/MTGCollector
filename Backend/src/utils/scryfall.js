const axios = require('axios');

const SCRYFALL_BASE = 'https://api.scryfall.com';

const HEADERS = {
  'User-Agent': 'mtgchest/1.0',
  'Accept':     'application/json',
};

// Rate-limit: minimum 100 ms between calls (Scryfall allows 2 req/s).
let lastCallTime = 0;

async function throttle() {
  const elapsed = Date.now() - lastCallTime;
  if (elapsed < 100) {
    await new Promise(r => setTimeout(r, 100 - elapsed));
  }
  lastCallTime = Date.now();
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
  };
}

/**
 * Resolve a card name (any language) to its canonical English name.
 * Returns the English name string if found, or null if not found / ambiguous.
 */
async function resolveCardName(name) {
  await throttle();
  try {
    const res = await axios.get(`${SCRYFALL_BASE}/cards/named`, {
      headers: HEADERS,
      params: { fuzzy: name },
    });
    return res.data.name; // canonical English name
  } catch {
    return null; // 404 not_found or ambiguous — caller will use original input
  }
}

/**
 * Full-text card search.
 * @param {object} [opts]
 * @param {boolean} [opts.includeMultilingual=false] - Include non-English prints (also searches foreign names).
 * @returns {{ data: object[], has_more: boolean, total_cards: number }}
 */
async function searchCards(q, page = 1, opts = {}) {
  await throttle();
  const params = { q, page, order: 'name' };
  if (opts.includeMultilingual) params.include_multilingual = true;
  try {
    const res = await axios.get(`${SCRYFALL_BASE}/cards/search`, {
      headers: HEADERS,
      params,
    });
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

/**
 * Batch-fetch cards by Scryfall UUID array.
 * Chunks into groups of 75 (API maximum) with throttling between chunks.
 * @returns {object[]} Normalized card objects for found cards.
 */
async function batchGetCards(scryfallIds) {
  if (!scryfallIds || !scryfallIds.length) return [];

  const results = [];
  for (let i = 0; i < scryfallIds.length; i += 75) {
    await throttle();
    const chunk       = scryfallIds.slice(i, i + 75);
    const identifiers = chunk.map(id => ({ id }));
    const res = await axios.post(
      `${SCRYFALL_BASE}/cards/collection`,
      { identifiers },
      { headers: { ...HEADERS, 'Content-Type': 'application/json' } },
    );
    results.push(...res.data.data.map(normalizeCard));
  }
  return results;
}

/**
 * Fetch the full Scryfall set list.
 * @returns {object[]} Raw Scryfall set objects.
 */
async function getSets() {
  await throttle();
  const res = await axios.get(`${SCRYFALL_BASE}/sets`, { headers: HEADERS });
  return res.data.data;
}

module.exports = { searchCards, batchGetCards, getSets, normalizeCard, resolveCardName };
