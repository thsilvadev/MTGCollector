const knex = require("../database/index");
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    

    if (!authHeader) {
        return res.sendStatus(401);
    }

    console.log("middleware logging token: ", authHeader);
    //the authorization comes like `{tokenType} + " " + {token}`. So we'll turn it into an array and separate these elements. For now we'll just use the token.
    const authArray = authHeader.split(" ");
    const trueToken = authArray[1]; // this is the {token}

    try {
        const data = jwt.verify(trueToken, "totalblackmetal");
        console.log("data: ", data);

        const user = await knex
            .select("users.id_user")
            .from("users")
            .where( "users.id_user", data.id )
            .first()
            .then((result) => result && result.id_user);

        if (!user) {
            return res.sendStatus(401);
        }

        req.userId = user;
        console.log("userId: ", req.userId)
        next();
    } catch (error) {
        console.error("JWT verification error:", error);
        return res.sendStatus(401);
    }
};
