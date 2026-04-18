const knex     = require('../database/index');
const scryfall = require('../utils/scryfall');

//METHODS

function isDraggable(collectionId, deckCards, collectionCards) {
  const collectionIdString = collectionId.toString();

  const onDeckCard = deckCards.find((card) => card.id_card.toString() === collectionIdString);
  const onCollectionCard = collectionCards.find((card) => card.id_collection.toString() === collectionIdString);

  const onDeckCounter = onDeckCard ? onDeckCard.countById : 0;
  const onCollectionCounter = onCollectionCard ? onCollectionCard.countById : 0;
  const cardName = onCollectionCard ? onCollectionCard.name : undefined;

  let nameCounter = 0;
  if (cardName) {
    for (const card of deckCards) {
      if (card.name === cardName) {
        nameCounter += card.countById;
      }
    }
  }

  const onCollectionSuperType = onCollectionCard ? onCollectionCard.supertypes : undefined;

  if (onCollectionCounter - onDeckCounter <= 0) {
    return false;
  } else if ((onDeckCounter >= 4 || nameCounter >= 4) && onCollectionSuperType !== "Basic") {
    return false;
  }

  return true;
}

//HANDLERS

module.exports = {
  async getDeck(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { id }    = req.params; // decks.id_deck
    const user_id   = req.userId;

    try {
      // ── Step 1: Get the deck's cards from the DB ─────────────────────────────
      // Each row is one card-slot in the deck (aggregated across duplicate copies).
      const deckRows = await knex('deck')
        .select(
          'collection.card_id',
          'deck.deck as id_deck',
          knex.raw('MIN(collection.id_collection) as id_collection'),
          knex.raw('MIN(deck.id_card)             as id_card'),
          knex.raw('MIN(deck.id_constructed)      as id_constructed'),
          knex.raw('COUNT(deck.id_card)           as countById'),
        )
        .join('collection', 'collection.id_collection', '=', 'deck.id_card')
        .join('decks',      'decks.id_deck',            '=', 'deck.deck')
        .where('deck.user_id', user_id)
        .where('decks.id_deck', id)
        .groupBy('collection.card_id', 'deck.deck')
        .orderBy(knex.raw('MIN(collection.id_collection)'), 'desc')
        .limit(120);

      if (!deckRows.length) {
        return res.json([]);
      }

      // ── Step 2: Fetch card data from Scryfall ────────────────────────────────
      const scryfallIds  = [...new Set(deckRows.map(r => r.card_id))];
      const scryfallCards = await scryfall.batchGetCards(scryfallIds);
      const cardMap       = new Map(scryfallCards.map(c => [c.id, c]));

      // ── Step 3: Merge DB rows with Scryfall data ─────────────────────────────
      const result = deckRows
        .map(row => {
          const cardData = cardMap.get(row.card_id);
          if (!cardData) return null;
          return {
            ...cardData,
            id_collection: row.id_collection,
            id_card:       row.id_card,
            id_constructed: row.id_constructed,
            id_deck:       row.id_deck,
            countById:     parseInt(row.countById, 10),
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

  //Post on Deck
  async postOnDeck(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //This is a body request. Data comes in json and not in params.
    const body = req.body;
    const { id_card } = body;
    const { deck } = body;

     //Authenticated userId
     const user_id = req.userId;

     //Backend validation (to prevent bugs and 'dups')
   // Fetch the deck cards and collection cards for the user
  const deckCards = await knex("deck").where({ user_id, deck });
  const collectionCards = await knex("collection").where({ user_id });

  // Check if the card drag operation is valid
  const isDraggableResult = isDraggable( id_card, deckCards, collectionCards);

  if (isDraggableResult !== true) {
    // Return an error response
    console.error(
      `Card drag operation failed for card ${id_card} on Deck ${deck} of user ${user_id} by ${req.ip} at ${formattedDate}`
    );
    return res.status(400).json({ error: isDraggableResult });
  } else {
    try {
      const result = await knex("deck").insert({
        id_card,
        deck,
        user_id
      });

      console.log(
        `Post successful of ${id_card} on Deck ${deck} of user ${user_id} by ${req.ip} at ${formattedDate}`
      );

      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({
        error:
          "TO BE UPDATE // TO BE UPDATED  // TO BE UPDATED // TO BE UPDATED // TO BE UPDATED // TO BE UPDATED.",
      });
    }
  }


    
  },

  async deleteById(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //Params request
    const { id_constructed } = req.params;

    //Authenticated userId
    const user_id = req.userId;

    try {
      const result = await knex
        .select("id_constructed")
        .from("deck")
        .where("deck.user_id" , user_id)
        .where(`id_constructed`, id_constructed )
        .del();

      console.log(
        `Delete successful of card number "${id_constructed}" of user ${user_id} by ${req.ip} at ${formattedDate}`
        //It is possible to inform which deck deleted card was in. Implement later.
      );

      return res.json(result);
    } catch (error) {
      console.error(
        `IP: ${req.ip}, Time: ${formattedDate}, id_constructed: ${id_constructed} ERROR:`,
        error
      );
      return res.status(500).json({
        error: "something went wrong",
      });
    }
  },
};
