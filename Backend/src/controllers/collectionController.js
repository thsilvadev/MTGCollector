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
          "supercards.scryfallId",
          "collection.id_collection"
        )
        //COUNT for card quantity. Alias needed to simplify key name to send to frontend.
        .count("id", { as: "countById" })
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
                this.where(key, "like", `%${sanitizedName}%`);
              });
              //Some Logging for more control
              console.log(`Sanitized name: ${sanitizedName}`);
              console.log(`name: ${value}`);
              continue;
            }

            //2)When nothing is typed, color check works as follows: search will return not only cards that match every color selected, but also cards of each color selected as well. But when user types anything, search will then return only cards that that match every color selected.
            if (key === "colorIdentity") {

              //To exclude cards containing colors not selected, we will create an array with all colors and compare it with the array of selected colors. So while we query for all cards containing ("like") the colors we want, we'll exclude all the cards that contains the colors we want but contain also colors we don't want. For example: you check blue and white. It should not show cards that are 'red and blue' or 'red and white'. It should show just cards that are blue, or white, or 'blue and white'.
              const allColors = ["B", "G", "R", "U", "W"];

              if (
                (!query.name || query.name === undefined) &&
                value !== "B, G, R, U, W"
              ) {
                const sanitizedColor = value.replace(/[, ]/g, "");
                const colorsArr = [...sanitizedColor];
                //compare all colors with colors selected => create array of excluded colors.
                const excludedColors = allColors.filter((color) => !colorsArr.includes(color));
                //build query of cards containing selected colors 
                builder.where(function () {
                  this.where(function () {
                    //this is for cards of all colors selected
                    this.where(key, value);
                    //this is for cards of any colors selected
                    if (colorsArr.length > 1) {
                      for (let i = 0; i < colorsArr.length; i++) {
                        this.orWhere(key, "like", `%${colorsArr[i]}%`);
                      }
                    }
                  });
                  //..and this excludes cards that contains the colors selected but also contains colors not selected.
                  if (excludedColors.length > 0) {
                    for (let i = 0; i < excludedColors.length; i++) {
                      this.andWhere(key, "not like", `%${excludedColors[i]}%`);
                    }
                  }
                });

                console.log(`Sanitized colorzzz: ${colorsArr}`);
                console.log(`color: ${value}`);
              } else if (
                //In the case of all colors selected, but no name input => bring all cards, including the colorless.
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
                        this.orWhere(key, "like", `%${colorsArr[i]}%`);
                      }
                    }
                    this.orWhere(key, "");
                  });
                });

                //Debugging
                console.log(
                  `Sanitized colorrr: ${colorsArr} of type:` + typeof colorsArr
                );
                console.log(`Value: ${value}`);
              } else if (query.name) {
                builder.where(key, value);
                console.log(`name typed and color selected`);
              }
              continue;
            }
            //3)When selecting card type in Search Container, bring cards that contains that type, not only those that are strictly of that type (e.g. when selecting Arctifact, bring Creature Artifact as well)
            if (key === "types") {
              builder.where(key, "like", `%${value}%`);
              console.log(`sanitized type: %${value}%`);
              continue;

            } else {
              //General general build
              builder.where(key, value);
              console.log("general build (no name, no type and no color input)");
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
        //This is for cards not to be repeated if more than one same card present in Collection.
        .groupBy("supercards.id")
        //Recent added cards first
        .orderBy("collection.id_collection", "desc")

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

  //Post on Colecction
  async postOnCollection(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //This is a body request. Data comes in json and not in params.
    const body = req.body;
    const { card_id } = body;
    const { card_condition } = body;

    try {
      const result = await knex("collection").insert({
        card_id,
        card_condition,
      });

      console.log(
        `Post successful of ${card_id} on Collection by ${req.ip} at ${formattedDate}`
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

  //This is a function to get card by ID. This is used to check if card is in Collection and how many of it there are.

  async getById(req, res) {
    const { id } = req.params;
    //SELECT * FROM cards WHERE id = {id}
    try {
      const result = await knex
        //SELECT just id
        .select("supercards.id")

        //COUNT (`id`)
        .count("id", { as: "countById" })
        //FROM supercards;
        .from("supercards")
        //JOIN collection
        .join("collection", "collection.card_id", "=", "supercards.id")
        .where({ id })
        .groupBy("id");

      return res.json(result);
    } catch (error) {
      console.error(`ip: ${req.ip}, ERROR:`, error);
      return res.status(500).json({
        error: "TO BE UPDATED",
      });
    }
  },

  async deleteById(req, res) {
    //Console logging with IP and Date (in yellow)
    const now = new Date();
    let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

    //Params request
    const { id_collection } = req.params;

    try {
      const result = await knex
        .select("id_collection")
        .from("collection")
        .where(`id_collection`, id_collection)
        .del();

      console.log(
        `Delete successful of card number "${id_collection}" on Collection by ${req.ip} at ${formattedDate}`
      );

      return res.json(result);
    } catch (error) {
      console.error(
        `IP: ${req.ip}, Time: ${formattedDate}, id_collection: ${id_collection} ERROR:`,
        error
      );
      return res.status(500).json({
        error: "something went wrong",
      });
    }
  },
};
