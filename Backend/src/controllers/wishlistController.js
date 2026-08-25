const knex = require('../database/index');
const scryfall = require('../utils/scryfall');

const PRICE_TTL_MS      = 24 * 60 * 60 * 1000; // 24 hours for cards with a known price
const NULL_PRICE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for cards cached as null

// Global lock — prevents concurrent wishlist requests from running parallel refreshes
let _refreshInFlight = false;

/**
 * Refresh prices for any card_ids that are missing or older than PRICE_TTL_MS.
 * Cards cached with usd = null are retried every NULL_PRICE_TTL_MS so that
 * the fallback lookup (via oracle_id) eventually fills in prices for non-English cards.
 * Upserts into card_prices using Scryfall's batch endpoint.
 */
async function refreshStalePrices(cardIds) {
  if (!cardIds.length) return;

  if (_refreshInFlight) {
    console.log('[Prices-Wishlist] Refresh already in progress — skipping concurrent call');
    return;
  }
  _refreshInFlight = true;

  try {
    const existing = await knex('card_prices')
      .select('card_id', 'usd', 'updated_at')
      .whereIn('card_id', cardIds);

    const existingMap = new Map(existing.map(r => [r.card_id, r]));
    const cutoff      = new Date(Date.now() - PRICE_TTL_MS);
    const nullCutoff  = new Date(Date.now() - NULL_PRICE_TTL_MS);

    const staleIds = cardIds.filter(id => {
      const row = existingMap.get(id);
      if (!row) return true;
      if (new Date(row.updated_at) < cutoff) return true;
      if (row.usd === null && new Date(row.updated_at) < nullCutoff) return true;
      return false;
    });

    console.log(`[Prices-Wishlist] refreshStalePrices: ${cardIds.length} cards checked, ${staleIds.length} stale`);
    if (!staleIds.length) return;

    const freshCards = await scryfall.batchGetCards(staleIds);
    if (!freshCards.length) return;

    const rows = freshCards.map(c => ({
      card_id:    c.id,
      usd:        c.prices?.usd ? parseFloat(c.prices.usd) : null,
      updated_at: new Date(),
    }));

    const withPrice    = rows.filter(r => r.usd !== null).length;
    const withoutPrice = rows.filter(r => r.usd === null).length;
    console.log(`[Prices-Wishlist] Scryfall batch: ${freshCards.length} returned — ${withPrice} with price, ${withoutPrice} without`);

    const pricelessCards = freshCards.filter(c => !c.prices?.usd && c.uuid);
    if (pricelessCards.length) {
      console.log(`[Prices-Wishlist] Starting fallback lookup for ${pricelessCards.length} priceless card(s)...`);
      const seen = new Set();
      for (const card of pricelessCards) {
        if (seen.has(card.uuid)) continue;
        seen.add(card.uuid);
        try {
          console.log(`[Prices-Wishlist] Looking up oracle ${card.uuid} ("${card.name}")`);
          const fallback = await scryfall.findUsdPrice(card.uuid);
          if (fallback !== null) {
            console.log(`[Prices-Wishlist] ✓ Fallback $${fallback} for "${card.name}"`);
            for (const row of rows) {
              if (row.usd === null) {
                const fc = freshCards.find(c => c.id === row.card_id && c.uuid === card.uuid);
                if (fc) row.usd = fallback;
              }
            }
          } else {
            console.log(`[Prices-Wishlist] ✗ No price found anywhere for "${card.name}" (oracle ${card.uuid})`);
          }
        } catch (err) {
          console.warn(`[Prices-Wishlist] findUsdPrice failed for oracle ${card.uuid}: ${err.message}`);
        }
      }
    }

    await knex.raw(
      `INSERT INTO card_prices (card_id, usd, updated_at)
       VALUES ${rows.map(() => '(?, ?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE usd = VALUES(usd), updated_at = VALUES(updated_at)`,
      rows.flatMap(r => [r.card_id, r.usd, r.updated_at]),
    );
    console.log(`[Prices-Wishlist] Upserted ${rows.length} price row(s)`);
  } finally {
    _refreshInFlight = false;
  }
}

/**
 * Calculate the total USD value for a user's wishlist using cached prices.
 * Returns a string like "12.34".
 */
async function getWishlistTotalCost(userId) {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(cp.usd * w.quantity), 0) AS total
     FROM wishlist w
     LEFT JOIN card_prices cp ON cp.card_id = w.card_id
     WHERE w.user_id = ?`,
    [userId],
  );
  return parseFloat(result[0][0].total).toFixed(2);
}

module.exports = {
  // Get all wishlist items for user
  async getAll(req, res) {
    try {
      const user_id = req.userId;
      const page = req.query.page || 0;
      const limit = 40;

      const wishlistRows = await knex('wishlist')
        .where('user_id', user_id)
        .limit(limit)
        .offset(page * limit);

      if (!wishlistRows.length) {
        return res.json({ items: [], page, totalCost: '0.00' });
      }

      // Fetch Scryfall data for all cards
      const cardIds = wishlistRows.map(w => w.card_id);
      
      // Refresh stale prices for all cards in this user's wishlist
      await refreshStalePrices(cardIds).catch(err =>
        console.warn('[Wishlist] Price refresh failed (non-fatal):', err.code ?? err.message),
      );

      const scryfallCards = await scryfall.batchGetCards(cardIds);
      const cardMap = new Map(scryfallCards.map(c => [c.id, c]));

      // Load cached prices
      const cachedPrices = await knex('card_prices')
        .select('card_id', 'usd')
        .whereIn('card_id', cardIds);
      const priceMap = new Map(cachedPrices.map(r => [r.card_id, r.usd]));

      // Merge wishlist with Scryfall data and prices
      const items = wishlistRows.map(row => {
        const cardData = cardMap.get(row.card_id);
        const cachedUsd = priceMap.get(row.card_id);
        return {
          id_wishlist: row.id_wishlist,
          card_id: row.card_id,
          name: cardData?.name || 'Unknown',
          qty: row.quantity || 1,
          imageUrl: cardData?.image_uris?.normal,
          colorIdentity: cardData?.colorIdentity,
          types: cardData?.types,
          keywords: cardData?.keywords,
          manaValue: cardData?.manaValue,
          rarity: cardData?.rarity,
          setCode: cardData?.setCode,
          prices: {
            usd: cardData?.prices?.usd ?? (cachedUsd != null ? String(cachedUsd) : null),
          },
        };
      });

      const totalCost = await getWishlistTotalCost(user_id);

      return res.json({ items, page, totalCost });
    } catch (error) {
      console.error('Wishlist getAll error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // Get single wishlist item
  async getById(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const wishlistRow = await knex('wishlist')
        .where('id_wishlist', id)
        .where('user_id', user_id)
        .first();

      if (!wishlistRow) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }

      const cardData = await scryfall.getCard(wishlistRow.card_id);

      return res.json({
        id_wishlist: wishlistRow.id_wishlist,
        card_id: wishlistRow.card_id,
        name: cardData?.name || 'Unknown',
        qty: wishlistRow.quantity || 1,
        imageUrl: cardData?.image_uris?.normal,
      });
    } catch (error) {
      console.error('Wishlist getById error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // Add or update wishlist item
  async create(req, res) {
    try {
      const { card_id, qty } = req.body;
      const user_id = req.userId;

      if (!card_id) {
        return res.status(400).json({ error: 'card_id required' });
      }

      const quantity = Math.min(Math.max(qty || 1, 1), 99);

      // Check if already exists
      const existing = await knex('wishlist')
        .where('card_id', card_id)
        .where('user_id', user_id)
        .first();

      if (existing) {
        // Update
        await knex('wishlist')
          .where('id_wishlist', existing.id_wishlist)
          .update({ quantity });
        return res.json({ success: true, id_wishlist: existing.id_wishlist, qty: quantity });
      } else {
        // Insert
        const result = await knex('wishlist').insert({
          card_id,
          user_id,
          quantity,
          in_collection: 0,
        });
        return res.json({ success: true, id_wishlist: result[0], qty: quantity });
      }
    } catch (error) {
      console.error('Wishlist create error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // Update quantity
  async update(req, res) {
    try {
      const { id } = req.params;
      const { qty } = req.body;
      const user_id = req.userId;

      if (!Number.isInteger(qty) || qty < 0 || qty > 99) {
        return res.status(400).json({ error: 'Quantity must be 0-99' });
      }

      const updated = await knex('wishlist')
        .where('id_wishlist', id)
        .where('user_id', user_id)
        .update({ quantity: qty });

      if (!updated) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }

      return res.json({ success: true, qty });
    } catch (error) {
      console.error('Wishlist update error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete wishlist item
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const deleted = await knex('wishlist')
        .where('id_wishlist', id)
        .where('user_id', user_id)
        .delete();

      if (!deleted) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Wishlist delete error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // Get wishlist items for a specific card (used by AI matching)
  async getByCardId(card_id, user_id) {
    try {
      return await knex('wishlist')
        .where('card_id', card_id)
        .where('user_id', user_id)
        .first();
    } catch (error) {
      console.error('Wishlist getByCardId error:', error);
      return null;
    }
  },

  // Batch get wishlist for multiple cards
  async getByCardIds(card_ids, user_id) {
    try {
      return await knex('wishlist')
        .where('user_id', user_id)
        .whereIn('card_id', card_ids);
    } catch (error) {
      console.error('Wishlist getByCardIds error:', error);
      return [];
    }
  },
};
