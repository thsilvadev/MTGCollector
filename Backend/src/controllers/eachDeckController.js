const knex = require("../database/index");

module.exports = {
  async getDeck(req, res) {
    //Console logging with IP and Date
    const now = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    const { id } = req.params;

    try {
      const result = await knex
        .select(
          "supercards.id",
          "supercards.name",
          "supercards.manaCost",
          "supercards.uuid",
          "supercards.scryfallId",
          "collection.id_collection",
          "deck.id_card",
          "decks.id_deck"
        )
        .count("id", { as: "countById" })
        .from("supercards")
        .join("collection", "collection.card_id", "=", "supercards.id")
        .join("deck", "deck.id_card", "=", "collection.id_collection")
        .join("decks", "decks.id_deck", "=", "deck.deck")

        .where("decks.id_deck", id)

        //This is for cards not to be repeated if more than one same card present in Collection.
        .groupBy("supercards.id")
        //Recent added cards first
        .orderBy("collection.id_collection", "desc")

        .limit(120);

      console.log(`Successfully got deck of id ${id} ${req.ip} at ${formattedDate}`);
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

    try {
      const result = await knex("deck").insert({
        id_card,
        deck,
      });

      console.log(
        `Post successful of ${id_card} on Deck ${deck} by ${req.ip} at ${formattedDate}`
      );

      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({
        error:
          "TO BE UPDATE // TO BE UPDATED  // TO BE UPDATED // TO BE UPDATED // TO BE UPDATED // TO BE UPDATED.",
      });
    }
  },
};
