//TO DO
//In this script I'm using some destructured variables.

const knex    = require('../database/index');
const scryfall = require('../utils/scryfall');

const PRICE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Refresh prices for any card_ids that are missing or older than PRICE_TTL_MS.
 * Upserts into card_prices using Scryfall's batch endpoint.
 */
async function refreshStalePrices(cardIds) {
  if (!cardIds.length) return;

  const existing = await knex('card_prices')
    .select('card_id', 'updated_at')
    .whereIn('card_id', cardIds);

  const existingMap = new Map(existing.map(r => [r.card_id, r.updated_at]));
  const cutoff      = new Date(Date.now() - PRICE_TTL_MS);

  const staleIds = cardIds.filter(id => {
    const updatedAt = existingMap.get(id);
    return !updatedAt || new Date(updatedAt) < cutoff;
  });

  if (!staleIds.length) return;

  const freshCards = await scryfall.batchGetCards(staleIds);
  if (!freshCards.length) return;

  const rows = freshCards.map(c => ({
    card_id:    c.id,
    usd:        c.prices?.usd ? parseFloat(c.prices.usd) : null,
    updated_at: new Date(),
  }));

  // INSERT ... ON DUPLICATE KEY UPDATE for upsert
  await knex.raw(
    `INSERT INTO card_prices (card_id, usd, updated_at)
     VALUES ${rows.map(() => '(?, ?, ?)').join(', ')}
     ON DUPLICATE KEY UPDATE usd = VALUES(usd), updated_at = VALUES(updated_at)`,
    rows.flatMap(r => [r.card_id, r.usd, r.updated_at]),
  );
}

/**
 * Calculate the total USD networth for a user's collection using cached prices.
 * Returns a string like "12.34".
 */
async function getNetworth(userId) {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(cp.usd * counts.cnt), 0) AS networth
     FROM (
       SELECT card_id, COUNT(*) AS cnt
       FROM collection
       WHERE user_id = ?
       GROUP BY card_id
     ) AS counts
     JOIN card_prices cp ON cp.card_id = counts.card_id`,
    [userId],
  );
  return parseFloat(result[0][0].networth).toFixed(2);
}

// Apply the same color-identity filter logic as the original SQL query, but in memory.
function matchesColorFilter(colorIdentity, filterValue) {
  if (!filterValue || filterValue === 'B, G, R, U, W') return true;

  const allColors      = ['B', 'G', 'R', 'U', 'W'];
  const colorsArr      = [...filterValue.replace(/[, ]/g, '')]; // e.g. ['G','U']
  const excludedColors = allColors.filter(c => !colorsArr.includes(c));
  const ci             = colorIdentity || '';

  // Multi-color: card must contain at least one selected color.
  // Single-color: card must be exactly that color.
  const hasSelectedColor =
    colorsArr.length > 1
      ? colorsArr.some(col => ci.includes(col)) || ci === filterValue
      : ci === filterValue;

  const hasExcludedColor = excludedColors.some(col => ci.includes(col));
  return hasSelectedColor && !hasExcludedColor;
}

module.exports = {
  async getCollection(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { params, query } = req;
    const { page }      = params;
    const userId        = req.userId;

    try {
      // ── Step 1: Fetch all grouped collection rows for this user ──────────────
      const allDbRows = await knex('collection')
        .select('card_id')
        .count('id_collection as countById')
        .max('id_collection as id_collection')
        .max('card_condition as card_condition')
        .where('user_id', userId)
        .groupBy('card_id')
        .orderBy(knex.raw('MAX(id_collection)'), 'desc');

      if (!allDbRows.length) {
        return res.json({ total: 0, cards: [], networth: '0.00' });
      }

      // ── Step 1b: Refresh stale prices for all cards in this user's collection ─
      const allCardIds = allDbRows.map(r => r.card_id);
      await refreshStalePrices(allCardIds);
      const hasEffectiveColorFilter =
        query.colorIdentity && query.colorIdentity !== 'B, G, R, U, W';
      const hasFilters =
        query.name || query.types || query.setCode || query.rarity || hasEffectiveColorFilter;

      let total, cards;

      if (!hasFilters) {
        // ── Fast path: paginate in DB, fetch only the current page from Scryfall ─
        total = allDbRows.length;
        const pageRows     = allDbRows.slice(page * 40, (page + 1) * 40);
        const scryfallIds  = pageRows.map(r => r.card_id);
        const scryfallCards = await scryfall.batchGetCards(scryfallIds);
        const cardMap      = new Map(scryfallCards.map(c => [c.id, c]));

        cards = pageRows
          .map(row => {
            const cardData = cardMap.get(row.card_id);
            if (!cardData) return null;
            return {
              ...cardData,
              id_collection: row.id_collection,
              countById:     parseInt(row.countById, 10),
              card_condition: row.card_condition,
            };
          })
          .filter(Boolean);

      } else {
        // ── Filtered path: fetch all cards from Scryfall, filter in memory ──────
        const allScryfallIds  = allDbRows.map(r => r.card_id);
        const allScryfallCards = await scryfall.batchGetCards(allScryfallIds);
        const cardMap          = new Map(allScryfallCards.map(c => [c.id, c]));

        let merged = allDbRows
          .map(row => {
            const cardData = cardMap.get(row.card_id);
            if (!cardData) return null;
            return {
              ...cardData,
              id_collection: row.id_collection,
              countById:     parseInt(row.countById, 10),
              card_condition: row.card_condition,
            };
          })
          .filter(Boolean);

        // Apply in-memory filters
        if (query.name) {
          const q = query.name.toLowerCase();
          merged = merged.filter(c => c.name?.toLowerCase().includes(q));
        }
        if (query.types) {
          const t = query.types.toLowerCase();
          merged = merged.filter(c => c.types?.toLowerCase().includes(t));
        }
        if (query.setCode) {
          merged = merged.filter(c => c.setCode === query.setCode);
        }
        if (query.rarity) {
          merged = merged.filter(c => c.rarity === query.rarity);
        }
        if (hasEffectiveColorFilter) {
          merged = merged.filter(c => matchesColorFilter(c.colorIdentity, query.colorIdentity));
        }

        total = merged.length;
        cards = merged.slice(page * 40, (page + 1) * 40);
      }

      const networth = await getNetworth(userId);

      console.log(
        `Collection request by ${req.ip} of user${userId} at ${formattedDate} ` +
        `(${cards.length}/${total} cards, page ${page})`
      );
      return res.json({ total, cards, networth });

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to load collection.' });
    }
  },

  // Add a card to the user's collection.
  // card_id is now a Scryfall UUID (VARCHAR 36).
  async postOnCollection(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { card_id, card_condition, ocr_fragment, oracle_id } = req.body;
    const user_id = req.userId;

    try {
      const result = await knex('collection').insert({ card_id, card_condition, user_id });
      console.log(`Post successful of ${card_id} on Collection of user${user_id} by ${req.ip} at ${formattedDate}`);

      // Update scan cache if the client supplied the OCR fragment that led to this card.
      // Fire-and-forget — don't block or fail the response if the cache write errors.
      if (ocr_fragment && oracle_id) {
        knex.raw(
          `INSERT INTO scan_cache (fragment, oracle_id, hits)
           VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE hits = hits + 1, last_seen = CURRENT_TIMESTAMP`,
          [ocr_fragment.slice(0, 255), oracle_id],
        ).catch(err => console.warn('[Collection] Cache write failed:', err.message));
      }

      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to add card to collection.' });
    }
  },

  // Check how many copies of a card (by Scryfall UUID) are in the user's collection.
  async getById(req, res) {
    const { id }  = req.params; // Scryfall UUID
    const userId  = req.userId;

    try {
      const result = await knex('collection')
        .select('card_id')
        .count('id_collection as countById')
        .where('user_id', userId)
        .where('card_id', id)
        .groupBy('card_id');

      // Return shape matches original: [{ id, countById }]
      return res.json(result.map(r => ({ id: r.card_id, countById: parseInt(r.countById, 10) })));
    } catch (error) {
      console.error(`ip: ${req.ip}, ERROR:`, error);
      return res.status(500).json({ error: 'Failed to check collection count.' });
    }
  },

  async deleteById(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { id_collection } = req.params;
    const user_id = req.userId;

    try {
      const result = await knex('collection')
        .where('user_id', user_id)
        .where('id_collection', id_collection)
        .del();

      console.log(`Delete successful of id_collection "${id_collection}" of user${user_id} by ${req.ip} at ${formattedDate}`);
      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}, id_collection: ${id_collection} ERROR:`, error);
      return res.status(500).json({ error: 'Failed to delete card from collection.' });
    }
  },
};
