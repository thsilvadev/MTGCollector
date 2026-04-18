require('dotenv').config();
const knex = require("../database/index");
//Encryption

const bcryptjs = require("bcryptjs");
const saltRounds = 10;

//JWT
const jwt = require("jsonwebtoken");

//Send Email
const nodeMailing = require("../email/email")

// In-memory rate limit: email -> timestamp of last resend
const resendCooldowns = new Map();
const RESEND_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

module.exports = {
    async postUser(req, res) {
        const now = new Date();
        let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    
        const body = req.body;
        const { email, password } = body;
        try {
            const existingUser = await knex('users').where('email', email).first();
    
            if (existingUser) {
                console.log(`User ${email} already exists. IP: ${req.ip}, Time: ${formattedDate}`);
                return res.status(200).json({ error: 'User already exists with this email.' });
            } else {
                // Hash the user's password using bcrypt
                const hashedPassword = await bcryptjs.hash(password, saltRounds);
    
                // Insert the user's data into the database with the hashed password
                const result = await knex("users").insert({
                    email,
                    password: hashedPassword, // Store the hashed password in the database
                });
    
                console.log(`user ${email} registered by ${req.ip} at ${formattedDate}. Result object: ${result}`);
    
                const confirmingEmail = await nodeMailing.confirmEmail(email);
                if (confirmingEmail === "Confirmation email successfully sent!") {
                    return res.json({ message: `User ${email} registered!`, confirm: "A confirmation email has just been sent. Please click on the provided link to confirm your email." });
                } else {
                    console.error("Error sending confirmation email:", confirmingEmail);
                    return res.status(500).json({ error: "Error sending confirmation email." });
                }
            }
        } catch (error) {
            console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
            return res.status(500).json({
                error: "User could not be registered.",
            });
        }
    }
    ,

    async resendConfirmation(req, res) {
        const now = new Date();
        let formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        try {
            const user = await knex('users').where('email', email).first();

            if (!user) {
                return res.status(404).json({ error: 'No account found with this email.' });
            }

            if (user.confirmed) {
                return res.status(400).json({ error: 'This account is already confirmed.' });
            }

            const lastSent = resendCooldowns.get(email);
            if (lastSent && (Date.now() - lastSent) < RESEND_COOLDOWN_MS) {
                const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
                const waitMin = Math.ceil(waitSec / 60);
                return res.status(429).json({ error: `Please wait ${waitMin} minute(s) before requesting another email.` });
            }

            resendCooldowns.set(email, Date.now());
            const result = await nodeMailing.confirmEmail(email);

            if (result === 'Confirmation email successfully sent!') {
                console.log(`Resent confirmation email to ${email}. IP: ${req.ip}, Time: ${formattedDate}`);
                return res.json({ message: 'Confirmation email resent successfully!' });
            } else {
                resendCooldowns.delete(email); // allow retry if send failed
                console.error('Error resending confirmation email:', result);
                return res.status(500).json({ error: 'Could not send email. Please try again later.' });
            }
        } catch (error) {
            console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
            return res.status(500).json({ error: 'An unexpected error occurred.' });
        }
    }
    ,

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

                const confirmingEmail = await nodeMailing.confirmEmail(email);

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
