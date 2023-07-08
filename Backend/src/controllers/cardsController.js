//In this script I'm using some destructured variables.


const knex = require("../database/index");

module.exports = {

  //GET CARDS

  //This is a function to get card by ID.
  async getById(req, res) {

    const { id } = req.params;
    //SELECT * FROM cards WHERE id = {id}
    const result = await knex("cards").where({ id });
    console.log('request ok from');

    return res.json(result);
  },


  //This is a function to get All cards and it works with filters.
  async getAll(req, res) {
  
    const { params, query } = req;

    const { page } = params;

    try {
      const result = await knex
      //SELECT id, name, types, setCode, manaCost, manaValue, rarity, uuid, colorIdentity, keywords 
      .select('id', 'name', 'types', 'setCode', 'manaCost', 'manaValue', 'rarity', 'uuid', 'colorIdentity', 'keywords', 'multiverseId')
      //FROM supercards;
      .from('supercards')

      //WHERE (condition)
      .where(builder => {
        for (const [key, value] of Object.entries(query)) {
          
          //[PRINTING FOR DEBUG]
          console.log({key, value, page})

          //1)When Card name is typed, query for cards starting with typed string (and not just contaning it. E.G: user types 'fire', we do not want 'Safire' cards showing up, just  'Fire breath' or 'Fire ember')
          const sanitizedValue = value.replace(/\\s/g, '');

          if (key === 'name'){
            
            builder.where(key, 'like', `${sanitizedValue}%`);
            console.log(sanitizedValue)
            return;
          }

          //2) When No color is selected, make it return colorless cards (by default it returns value='' but we need it to return value=null)
          if (key === 'colorIdentity' && value === 'colorless'){
            builder.where(key, null)
            return;
          }
          //General build
            builder.where(key, value)
        }
      })

      
      //Not showing cards with faulty images or wrong images
      .whereRaw("multiverseId IS NOT NULL AND NOT multiverseId = '580709' AND NOT multiverseId = '580711'")

      .orderBy("Rarity", "asc")
      
      .limit(40)
      
      .offset(page * 40);

    console.log('Request successful');
    return res.json(result);
  } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({error: 'Probably request values are mispelled. Try querying for it on phpMyAdmin or take a look at the column values to check for virgules, spaces or any other detail.'});
    }}
    ,

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
