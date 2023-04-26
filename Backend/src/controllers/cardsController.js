const knex = require("../database/index");

module.exports = {
  //GET CARDS
  async getById(req, res) {
    const { id } = req.params;

    const result = await knex("cards").where({ id });

    return res.json(result);
  },

  async getAll(req, res) {
    const result = await knex("cards");

    return res.json(result);
  },

  //COPY CARDS

  /* 
  
  
        BUNCHA
            STUFF
                TO
                   DO
  
  
  */
};
