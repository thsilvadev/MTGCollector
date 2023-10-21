const knex = require("../database/index");

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
    //Console logging with IP and Date
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    const { id } = req.params; // deck.deck (OR decks.id_deck)

    //Authenticated userId
    const user_id = req.userId;

    try {
      const result = await knex
        .select(
          "supercards.id",
          "supercards.name",
          "supercards.manaCost",
          "supercards.manaValue",
          "supercards.colorIdentity",
          "supercards.keywords",
          "supercards.types",
          "supercards.uuid",
          "supercards.scryfallId",
          "supercards.supertypes",
          "collection.id_collection",
          "deck.id_card",
          "deck.id_constructed",
          "decks.id_deck"
        )
        .count("id", { as: "countById" })
        .from("supercards")
        .join("collection", "collection.card_id", "=", "supercards.id")
        .join("deck", "deck.id_card", "=", "collection.id_collection")
        .join("decks", "decks.id_deck", "=", "deck.deck")
        .where("deck.user_id", user_id)
        .where("decks.id_deck", id)

        //This is for cards not to be repeated if more than one same card present in Collection.
        .groupBy("supercards.id")
        //Recent added cards first
        .orderBy("collection.id_collection", "desc")

        .limit(120);

      console.log(`Successfully got deck of id ${id} of user${user_id} ${req.ip} at ${formattedDate}`);
      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({
        error:
          "Probably request keys are mispelled. Try querying for it on phpMyAdmin or take a look at the column values to check for virgules, spaces or any other detail.",
      });
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
