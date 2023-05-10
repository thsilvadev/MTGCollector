const knex = require("../database/index");

module.exports = {
  //GET CARDS
  async getById(req, res) {
    const { id } = req.params;

    const result = await knex("cards").where({ id });
    console.log(res);

    return res.json(result);
  },

  async getAll(req, res) {
    const { page } = req.params;


    const result = await knex("cards").orderBy("id", "desc").limit(40).offset(page * 40);

    return res.json(result);
  },

  async getBySet(req, res) {

    const { set } = req.params
    const { page } = req.params
    const result = await knex("cards").where({setCode: `${set}`}).orderBy("id", "desc").limit(40).offset(page * 40);

    return res.json(result);
  }

  //COPY CARDS


  /* 
  
  
        BUNCHA
            STUFF
                TO
                   DO
  
  
  */
};
