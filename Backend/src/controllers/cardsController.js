//In this script I'm using some destructured variables.


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
    
    //This is a function to get All cards and it works with filters.
    //
    const { params, query } = req;

    const { page } = params;

    const result = await knex

      .select('id', 'name', 'types', 'setCode', 'manaCost', 'manaValue', 'rarity', 'multiverseId', 'colorIdentity')
      
      .from('cards')
    
      .where(builder => {
        for (const [key, value] of Object.entries(query)) {
          console.log({key, value})
          //this is for Card Name Typing search
          const sanitizedValue = value.replace(/\\s/g, '');

          if (key === 'name'){
            
            builder.where(key, 'like', `${sanitizedValue}%`);
            console.log(sanitizedValue)
            return;
          }

          //for COLORLESS (colorIdentity value IS NULL)
          if (key === 'colorIdentity' && value === 'colorless'){
            builder.where(key, null)
            return;
          }
            builder.where(key, value)
        }
      })
      .whereRaw("multiverseId IS NOT NULL AND NOT multiverseId = '580709' AND NOT multiverseId = '580711'")

      .orderBy("Rarity", "asc")
      
      .limit(40)
      
      .offset(page * 40);

    return res.json(result);
  },

  async getBySet(req, res) {

    const { set } = req.params
  
    const { page } = req.params
    const result = await knex("cards").where({setCode: `${set}`}).orderBy("id", "desc").limit(40).offset(page * 40);

    return res.json(result);
  },





    /*
  async getByFilters(req, res) {



    const query = req.query

    const { manavalue } = query.manavalue
    const { set } = query.setCode
    const { colors } = query.colors
    const { type } = query.type
    const { rarity } = query.rarity
    const { name } = query.rarity

    let filteredResults = await knex("cards").where(builder => {
      for (const [key, value] of Object.entries(query)) {
        builder.where(key, value)
      }
    }) ;

    
    return res.json(result);

  }
    */

  //COPY CARDS


  /* 
  
  
        BUNCHA
            STUFF
                TO
                   DO
  
  
  */
};
