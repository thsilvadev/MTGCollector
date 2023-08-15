const knex = require("../database/index");

module.exports = {
  //This is a function to get all cards from Collection
  async getDecks(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

 

    const { page } = req.params;

    try {
      const result = await knex

      .select(
        "decks.name",
        "decks.description",
        "decks.color",
        "decks.id_deck"
      )
      .from("decks")
      .orderBy("decks.id_deck", "desc")
      .limit(20)
      .offset(page * 20);

    console.log(`Successfully got decks. Request by ${req.ip}`)
    return res.json(result);



    } catch (error) {
        console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
        return res.status(500).json({
          error:
            "Probably request keys are mispelled. Try querying for it on phpMyAdmin or take a look at the column values to check for virgules, spaces or any other detail.",
        });
    }
  },

  //Post Deck
  async postDeck(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //This is a body request. Data comes in json and not in params.
    const body = req.body;
    const { name } = body;
    const { description } = body;
    const {color} = body;

    try {
      const result = await knex("decks").insert({
        name,
       description,
       color,
       card_count,
      });

      console.log(
        `Post successful of ${body} on Collection by ${req.ip} at ${formattedDate}`
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
