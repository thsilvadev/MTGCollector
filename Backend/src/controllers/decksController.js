const knex = require("../database/index");
//authentication

module.exports = {
  //This is a function to get all cards from Collection
  async getDecks(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

 

    const { page } = req.params;

    //Authenticated userId
    const user_id = req.userId;

    try {
      const result = await knex

      .select(
        "decks.name",
        "decks.description",
        "decks.color",
        "decks.id_deck",
        "decks.card_count"
        
      )
      .from("decks")
      .where("decks.user_id", user_id)
      .orderBy("decks.id_deck", "desc")
      .limit(15)
      .offset(page * 15);

    console.log(`Successfully got decks  of user${user_id}. Request by ${req.ip}`)
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
    const {card_count} = body;

    //Authenticated userId
    const user_id = req.userId

    try {
      const result = await knex("decks").insert({
        name,
       description,
       color,
       user_id,
       card_count
      });

      console.log(
        `Post successful of ${body} on Collection of user${user_id} by ${req.ip} at ${formattedDate}`
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

  async deleteById(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //Params request
    const { id_deck } = req.params;

    //Authenticated userId
    const user_id = req.userId;

    try {
      const result = await knex
        .select("id_deck")
        .from("decks")
        .where("decks.user_id" , user_id)
        .where(`id_deck`, id_deck )
        .del();

      console.log(
        `Delete successful of deck number "${id_deck}" of user ${user_id} by ${req.ip} at ${formattedDate}`
      );

      return res.json(result);
    } catch (error) {
      console.error(
        `IP: ${req.ip}, Time: ${formattedDate}, id_deck: ${id_deck} ERROR:`,
        error
      );
      return res.status(500).json({
        error: "something went wrong",
      });
    }
  },

  //Update Deck
  async updateDeck(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //This is a body request. Data comes in json and not in params.
    const body = req.body;
    const {id_deck} = req.params
    const {card_count} = body;
    const { name } = body;
    const { description } = body;
    const {color} = body;

    //Authenticated userId
    const user_id = req.userId

    try {
      const result = await knex
      .select("decks.id_deck")
      .from("decks")
      .where("decks.user_id", user_id)
      .where("decks.id_deck", id_deck)
      .update({
        name,
        color,
       description,
       card_count,
      });

      console.log(
        `Put successful of ${color} and ${card_count} on Deck ${id_deck} of user ${user_id} by ${req.ip} at ${formattedDate}`
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
