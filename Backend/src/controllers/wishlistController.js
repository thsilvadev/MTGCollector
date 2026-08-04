const knex = require('../database/index');
const scryfall = require('../utils/scryfall');

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
        return res.json({ items: [], page });
      }

      // Fetch Scryfall data for all cards
      const cardIds = wishlistRows.map(w => w.card_id);
      const scryfallCards = await scryfall.batchGetCards(cardIds);
      const cardMap = new Map(scryfallCards.map(c => [c.id, c]));

      // Merge wishlist with Scryfall data
      const items = wishlistRows.map(row => ({
        id_wishlist: row.id_wishlist,
        card_id: row.card_id,
        name: cardMap.get(row.card_id)?.name || 'Unknown',
        qty: row.quantity || 1,
        imageUrl: cardMap.get(row.card_id)?.image_uris?.normal,
        colorIdentity: cardMap.get(row.card_id)?.colorIdentity,
        types: cardMap.get(row.card_id)?.types,
      }));

      return res.json({ items, page });
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

      const quantity = Math.min(Math.max(qty || 1, 1), 4);

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

      if (!Number.isInteger(qty) || qty < 0 || qty > 4) {
        return res.status(400).json({ error: 'Quantity must be 0-4' });
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
