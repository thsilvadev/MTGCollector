const knex     = require('../database/index');
const scryfall = require('../utils/scryfall');

// ── VALIDATION HELPER ────────────────────────────────────────────────────────
// Returns an error string if the card cannot be added, null if valid.
// collectionIds : all id_collection values the user owns for this Scryfall card
// deckRows      : all raw rows in `deck` table for this deck (main + sideboard)
// totalOwned    : how many copies the user owns
// isSideboard   : true when adding to sideboard
function validateAdd(collectionIds, deckRows, totalOwned, isSideboard) {
  // How many copies are already placed across the full 75 (main + sideboard)?
  const totalPlaced = deckRows.filter(r => collectionIds.includes(r.id_card)).length;

  if (totalPlaced >= totalOwned) {
    return 'Not enough copies in collection';
  }

  if (isSideboard) {
    const sideboardTotal = deckRows.filter(r => r.sideboard).length;
    if (sideboardTotal >= 15) {
      return 'Sideboard is full (max 15 cards)';
    }
  }

  return null;
}

//HANDLERS

module.exports = {
  async getDeck(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { id }    = req.params;
    const user_id   = req.userId;

    try {
      // ── Step 1: Get the deck's cards from the DB ─────────────────────────────
      // Group by card_id + deck + sideboard so the same card can appear as
      // separate rows for main deck and sideboard.
      const deckRows = await knex('deck')
        .select(
          'collection.card_id',
          'deck.deck as id_deck',
          'deck.sideboard',
          knex.raw('MIN(collection.id_collection) as id_collection'),
          knex.raw('MIN(deck.id_card)             as id_card'),
          knex.raw('MIN(deck.id_constructed)      as id_constructed'),
          knex.raw('COUNT(deck.id_card)           as countById'),
        )
        .join('collection', 'collection.id_collection', '=', 'deck.id_card')
        .join('decks',      'decks.id_deck',            '=', 'deck.deck')
        .where('deck.user_id', user_id)
        .where('decks.id_deck', id)
        .groupBy('collection.card_id', 'deck.deck', 'deck.sideboard')
        .orderBy(knex.raw('MIN(collection.id_collection)'), 'desc')
        .limit(150);

      if (!deckRows.length) {
        return res.json([]);
      }

      // ── Step 2: Fetch card data from Scryfall ────────────────────────────────
      const scryfallIds   = [...new Set(deckRows.map(r => r.card_id))];
      const scryfallCards = await scryfall.batchGetCards(scryfallIds);
      const cardMap       = new Map(scryfallCards.map(c => [c.id, c]));

      // ── Step 2b: Count how many copies user owns per card ────────────────────
      const collectionCounts = await knex('collection')
        .select('card_id', knex.raw('COUNT(*) as inCollection'))
        .where({ user_id })
        .whereIn('card_id', scryfallIds)
        .groupBy('card_id');
      const collectionCountMap = new Map(
        collectionCounts.map(c => [c.card_id, parseInt(c.inCollection, 10)])
      );

      // ── Step 3: Merge DB rows with Scryfall data ─────────────────────────────
      const result = deckRows
        .map(row => {
          const cardData = cardMap.get(row.card_id);
          if (!cardData) return null;
          return {
            ...cardData,
            id_collection:  row.id_collection,
            id_card:        row.id_card,
            id_constructed: row.id_constructed,
            id_deck:        row.id_deck,
            countById:      parseInt(row.countById, 10),
            inCollection:   collectionCountMap.get(row.card_id) || 0,
            sideboard:      Boolean(row.sideboard),
          };
        })
        .filter(Boolean);

      console.log(`Successfully got deck ${id} of user${user_id} at ${formattedDate}`);
      return res.json(result);

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to load deck.' });
    }
  },

  // Add a card to the main deck or sideboard
  async postOnDeck(req, res) {
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { id_card, deck, sideboard = false } = req.body;
    const user_id   = req.userId;
    const isSideboard = !!sideboard;

    try {
      // Resolve which Scryfall card this collection entry belongs to
      const collEntry = await knex('collection')
        .where({ id_collection: id_card, user_id })
        .first();

      if (!collEntry) {
        return res.status(400).json({ error: 'Card not found in your collection' });
      }

      // All id_collection values the user owns for this Scryfall card
      const collectionIds = await knex('collection')
        .where({ card_id: collEntry.card_id, user_id })
        .pluck('id_collection');

      // All deck rows for this deck (main + sideboard combined)
      const deckRows = await knex('deck').where({ user_id, deck });

      const error = validateAdd(collectionIds, deckRows, collectionIds.length, isSideboard);
      if (error) {
        console.error(`postOnDeck rejected: ${error} — card ${id_card}, deck ${deck}, user ${user_id}`);
        return res.status(400).json({ error });
      }

      const result = await knex('deck').insert({
        id_card,
        deck,
        user_id,
        sideboard: isSideboard ? 1 : 0,
      });

      console.log(`Post successful: card ${id_card} → deck ${deck} (sideboard=${isSideboard}) of user ${user_id} at ${formattedDate}`);
      return res.json(result);

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to add card to deck.' });
    }
  },

  // Set exact quantity of a card in the main deck or sideboard.
  // Cross-partition ownership is enforced: main + sideboard combined cannot exceed owned copies.
  async setQty(req, res) {
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { card_id, deck, qty, sideboard = false } = req.body;
    const user_id   = req.userId;
    const isSideboard = !!sideboard;
    const newQty    = parseInt(qty, 10);

    if (isNaN(newQty) || newQty < 0 || newQty > 99) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    try {
      // All collection entries for this Scryfall card
      const collectionEntries = await knex('collection').where({ card_id, user_id });
      const totalOwned    = collectionEntries.length;
      const collectionIds = collectionEntries.map(c => c.id_collection);

      // Current qty in the target partition (main or sideboard)
      const targetRows = await knex('deck')
        .where({ deck, user_id, sideboard: isSideboard ? 1 : 0 })
        .whereIn('id_card', collectionIds);
      const currentQty = targetRows.length;

      // Qty already in the OTHER partition
      const otherRows = await knex('deck')
        .where({ deck, user_id, sideboard: isSideboard ? 0 : 1 })
        .whereIn('id_card', collectionIds);
      const otherPartitionQty = otherRows.length;

      // Cross-partition ownership check
      if (newQty + otherPartitionQty > totalOwned) {
        return res.status(400).json({ error: 'Not enough copies in collection' });
      }

      // Sideboard total-size check
      if (isSideboard) {
        const { count } = await knex('deck').where({ deck, user_id, sideboard: 1 }).count('* as count').first();
        const totalSideboard = parseInt(count);
        if (totalSideboard - currentQty + newQty > 15) {
          return res.status(400).json({ error: 'Sideboard cannot exceed 15 cards' });
        }
      }

      if (newQty === currentQty) return res.json({ message: 'No change' });

      if (newQty > currentQty) {
        const toAdd = newQty - currentQty;
        const inserts = Array.from({ length: toAdd }, () => ({
          id_card: collectionIds[0], deck, user_id, sideboard: isSideboard ? 1 : 0,
        }));
        await knex('deck').insert(inserts);
      } else {
        const toRemove = currentQty - newQty;
        const idsToDelete = targetRows.slice(0, toRemove).map(r => r.id_constructed);
        await knex('deck').whereIn('id_constructed', idsToDelete).where({ user_id }).del();
      }

      console.log(`setQty: ${card_id} in deck ${deck} (sideboard=${isSideboard}) → ${newQty} for user ${user_id} at ${formattedDate}`);
      return res.json({ success: true, qty: newQty });

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to set deck card quantity.' });
    }
  },

  // Move all copies of a card between main deck ↔ sideboard (atomic flip)
  async moveCard(req, res) {
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { card_id, deck, sideboard, qty } = req.body; // card_id = Scryfall UUID
    const user_id   = req.userId;
    const toSideboard = !!sideboard;

    try {
      const collectionIds = await knex('collection')
        .where({ card_id, user_id })
        .pluck('id_collection');

      if (!collectionIds.length) {
        return res.status(400).json({ error: 'Card not in collection' });
      }

      // Rows in the SOURCE partition
      const sourceRows = await knex('deck')
        .where({ deck, user_id, sideboard: toSideboard ? 0 : 1 })
        .whereIn('id_card', collectionIds);

      if (!sourceRows.length) {
        return res.json({ message: 'No cards to move', moved: 0 });
      }

      const toMove = qty ? Math.min(parseInt(qty, 10), sourceRows.length) : sourceRows.length;

      if (toSideboard) {
        const { count } = await knex('deck')
          .where({ deck, user_id, sideboard: 1 })
          .count('* as count')
          .first();
        if (parseInt(count) + toMove > 15) {
          return res.status(400).json({
            error: `Cannot move: sideboard would exceed 15 cards (currently ${count})`,
          });
        }
      }

      const idsToUpdate = sourceRows.slice(0, toMove).map(r => r.id_constructed);
      await knex('deck')
        .whereIn('id_constructed', idsToUpdate)
        .where({ user_id })
        .update({ sideboard: toSideboard ? 1 : 0 });

      console.log(`moveCard: ${card_id} in deck ${deck} → sideboard=${toSideboard} (qty=${toMove}) for user ${user_id} at ${formattedDate}`);
      return res.json({ success: true, moved: toMove });

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to move card.' });
    }
  },

  async deleteById(req, res) {
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { id_constructed } = req.params;
    const user_id = req.userId;

    try {
      const result = await knex
        .select('id_constructed')
        .from('deck')
        .where('deck.user_id', user_id)
        .where('id_constructed', id_constructed)
        .del();

      console.log(`Delete successful of card number "${id_constructed}" of user ${user_id} by ${req.ip} at ${formattedDate}`);
      return res.json(result);

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}, id_constructed: ${id_constructed} ERROR:`, error);
      return res.status(500).json({ error: 'something went wrong' });
    }
  },
};
