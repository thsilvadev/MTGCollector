require('dotenv').config();
const knex = require("../database/index");
//Encryption

const bcryptjs = require("bcryptjs");
const saltRounds = 10;

//JWT
const jwt = require("jsonwebtoken");

//Send Email
const nodeMailing = require("../email/email")

module.exports = {
    async postUser(req, res) {
        //Console logging with IP and Date (in yellow)
        const now = new Date();
        let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

        //This is a body request. Data comes in json and not in params.
        const body = req.body;
        const { email, password } = body;
        try {
            // Check if a user with the same email already exists
            const existingUser = await knex('users').where('email', email).first();

            if (existingUser) {
                // User with the same email already exists, return an error
                console.log(`User ${email} already exists. IP: ${req.ip}, Time: ${formattedDate}`);
                return res.status(200).json({ error: 'User already exists with this email.' });
            } else {
                // Hash the user's password using bcrypt
                bcryptjs.hash(password, saltRounds, async (err, hashedPassword) => {
                    if (err) {
                        console.error("Error hashing password:", err);
                        return res.status(500).json({ error: "Error hashing password." });
                    }



                    // Insert the user's data into the database with the hashed password
                    const result = await knex("users").insert({
                        email,
                        password: hashedPassword, // Store the hashed password in the database
                    });

                    console.log(
                        `user ${email} registered by ${req.ip} at ${formattedDate}. Result object: ${result}`
                    );
                })

                    const confirmingEmail = await nodeMailing.confirmEmail(req);
                    if (confirmingEmail === "Confirmation email successfully sent!") {
                        return res.json({ message: `User ${email} registered!`, confirm: "A confirmation email has just been sent. Please click on the provided link to confirm your email." });
                    } else {
                        // Handle the case where sending the confirmation email fails.
                        console.error("Error sending confirmation email:", confirmingEmail);
                        return res.status(500).json({ error: "Error sending confirmation email." });
                    }

                


            }
        } catch (error) {
            console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
            return res.status(500).json({
                error:
                    "User could not be registered.",
            });
        }



    },

    async loginUser(req, res) {
        //Console logging with IP and Date (in yellow)
        const now = new Date();
        let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;

        //This is a body request. Data comes in json and not in params.
        const body = req.body;
        const { email, password } = body;

        try {
            const user = await knex("users").where({ email }).first();

            if (!user) {
                // User with the provided email not found
                console.log(`User with email ${email} not found. IP: ${req.ip}, Time: ${formattedDate}`);
                return res.status(200).json({ error: "User not found." });
            }

            if (!user.confirmed) {
                // User email not confirmed
                console.log(`User with email ${email} is not confirmed. IP: ${req.ip}, Time: ${formattedDate}`);

                const confirmingEmail = await nodeMailing.confirmEmail(req);

                if (confirmingEmail === "Confirmation email successfully sent!") {
                    return res.status(200).json({ error: "A confirmation email has just been sent. Please click on provided link to confirm your email." });
                } else {

                    // Handle the case where sending the confirmation email fails.
                    console.error("Error sending confirmation email:", confirmingEmail);
                    return res.status(500).json({ error: "Error sending confirmation email. Please, try again later." });

                }
            }

            // Check if the provided password matches the user's password
            bcryptjs.compare(password, user.password, (err, result) => {
                if (result) {
                    // Create Json Web Token for authentication
                    const token = jwt.sign({ id: user.id_user, email: user.email }, process.env.AUTH_TOKEN_TAG)

                    // Password matches, user logged in
                    console.log(`User with email ${email} logged in. IP: ${req.ip}, Time: ${formattedDate}`);
                    return res.json({ message: `User with email ${email} logged in.`, id: user.id_user, token });
                } else {
                    // Password doesn't match
                    console.log(`Wrong password for user with email ${email}. IP: ${req.ip}, Time: ${formattedDate}`);
                    return res.status(200).json({ error: "Wrong password." });
                }
            });

        } catch (error) {
            console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
            return res.status(500).json({
                error:
                    "User could not log in.",
            });
        }
    }
}