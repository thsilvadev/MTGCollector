//TO DO
//In this script I'm using some destructured variables.

const knex = require("../database/index");

module.exports = {
  //This is a function to get all cards from Collection
  async getCollection(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    const { params, query } = req;

    const { page } = params;

    try {
      const result = await knex
        //SELECT id, name, types, setCode, manaCost, manaValue, rarity, uuid, colorIdentity, keywords
        .select(
          "supercards.id",
          "supercards.name",
          "supercards.types",
          "supercards.setCode",
          "supercards.manaCost",
          "supercards.manaValue",
          "supercards.rarity",
          "supercards.uuid",
          "supercards.colorIdentity",
          "supercards.keywords",
          "supercards.multiverseId",
          "supercards.scryfallId"
        )
        //FROM supercards;
        .from("supercards")
        //JOIN collection
        .join("collection", "collection.card_id", "=", "supercards.id")

        //WHERE (condition)
        .where((builder) => {
          for (const [key, value] of Object.entries(query)) {
            //[PRINTING FOR DEBUG]
            console.log({ key, value, page });

            //1)When Card name is typed, query for cards starting with typed string (and not just contaning it. E.G: user types 'fire', we do not want 'Safire' cards showing up, just  'Fire breath' or 'Fire ember')

            if (key === "name") {
              const sanitizedName = value.replace(/\s/g, "");
              builder.where(function () {
                this.where(key, "like", `%${sanitizedName}%`)
              });
              //Some Logging for more control
              console.log(`Sanitized name: ${sanitizedName}`);
              console.log(`name: ${value}`);
              continue;
            }

            //2)When nothing is typed, color check works as follows: search will return only cards that that match every color selected. But when user types anything, search will then return not only cards that match every color selected, but also cards of each color selected as well.
          if (key === "colorIdentity") {
            if (
              (!query.name || query.name === undefined) &&
              value !== "B, G, R, U, W"
            ) {
              const sanitizedColor = value.replace(/[, ]/g, "");
              const colorsArr = [...sanitizedColor];

              builder.where(function () {
                this.where(function () {
                  this.where(key, value);
                  if (colorsArr.length > 1) {
                    for (let i = 0; i < colorsArr.length; i++) {
                      this.orWhere(key, 'like', `%${colorsArr[i]}%`)
                    }
                  }
                })
              })

              console.log(`Sanitized colorzzz: ${colorsArr}`);
              console.log(`color: ${value}`);
            }
            else if (
              (!query.name || query.name === undefined) &&
              value === "B, G, R, U, W"
            ) {
              const sanitizedColor = value.replace(/[, ]/g, "");
              const colorsArr = [...sanitizedColor];

              builder.where(function () {
                this.where(function () {
                  this.where(key, value);
                  if (colorsArr.length > 1) {
                    for (let i = 0; i < colorsArr.length; i++) {
                      this.orWhere(key, 'like', `%${colorsArr[i]}%`);
                    }
                  }
                  this.orWhere(key, "");
                })
              })

              //Debugging
              console.log(
                `Sanitized colorrr: ${colorsArr} of type:` + typeof colorsArr
              );
              console.log(`Value: ${value}`);
            } 

            else if (query.name){
              builder.where(key, value);
              console.log(`name typed and color selected`)
            } continue;
          }
          else {
            //General general build
          builder.where(key, value); 
            console.log('General general build (no name and no color input)')
        }

          //Not necessary anymore because of DB update. Now it counts '' as colorless, and not null value. So by default when no color is selected, it will return colorless cards.
          /*
                //3) When No color is selected, make it return colorless cards (by default it returns value='' but we need it to return value=null)
                if (key === 'colorIdentity' && value === 'colorless'){
                  builder.where(key, '')
                  return;

                }
                  */
        }
      })

        //Not showing cards with faulty images or wrong images
        .whereRaw(
          "multiverseId IS NOT NULL AND NOT multiverseId = '580709' AND NOT multiverseId = '580711'"
        )

        .orderBy("Rarity", "asc")

        .limit(40)

        .offset(page * 40);

      console.log(`Request successful by ${req.ip} at ${formattedDate}`);
      return res.json(result);
    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({
        error:
          "Probably request keys are mispelled. Try querying for it on phpMyAdmin or take a look at the column values to check for virgules, spaces or any other detail.",
      });
    }
  },

  async PostOnCollection(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    const body = req.body;
    const { card_id } = body;
    const { card_condition } = body;

    try {
      const result = await knex("collection").insert({
        card_id,
        card_condition,
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
