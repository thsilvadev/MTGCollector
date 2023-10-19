const knex = require("../database/index");

module.exports = {
  //GET CARDS

  //This is a function to get card by ID. [STILL HAVEN'T FIGGURED OUT WHERE TO USE].
  async getSets(req, res) {
 
        try {
          const result = await knex
            
            .select(
              "keyruneCode",
              "name"
            )
            //FROM supercards;
            .from("sets")
            .whereNotNull("mcmName");
         //Console logging with IP and Date
        const now = new Date();
        const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
  
        console.log(`Request successful by ${req.ip} at ${formattedDate}`);
        return res.json(result);
      } catch (error) {
        //Console logging with IP and Date
        const now = new Date();
        const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
        console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
        return res
          .status(500)
          .json({
            error:
              "Probably request keys are mispelled. Try querying for it on phpMyAdmin or take a look at the column values to check for virgules, spaces or any other detail.",
          });
      }
}
}