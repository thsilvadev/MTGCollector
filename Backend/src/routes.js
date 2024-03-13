const express = require('express');

//Authentication Middleware
//This is a middleware which goes after declaring route and before function call. It authenticates the request by checking the json web token that comes within it´s headers (req.headers.authorization). It sanitizes the header, extract the pure token and verify it´s authetincity. If authentic, it gathers account id and email (information which was previously embedded in token cryptographically when token was first signed), and send just the id_user as req.userId. 
const authMiddleware = require("./middleware/authMiddleware")

/////////// CONTROLLERS //////////////

const cardsController = require('./controllers/cardsController');
const collectionController = require('./controllers/collectionController');
const decksController = require('./controllers/decksController');
const eachDeckController = require('./controllers/eachDeckController');
const setsController = require('./controllers/setsController')
const usersController = require('./controllers/usersController');
//const wishlistController = require('./controllers/wishlistController');

/////////// EMAIL ////////////
const email = require('./email/email');



//Controller requests and it's responses will go to routes
const routes = express.Router();


///////ROUTES AND REQUISITIONS FOR THE CARDS TABLE

routes.get('/cards/:page', cardsController.getAll); // GET cards

//routes.copy('/cards/:id', cardsController.copy); //COPY cards








///////ROUTES AND REQUISITIONS FOR THE COLLECTION TABLE 
routes.get('/collection/:page', authMiddleware, collectionController.getCollection); // GET collection
routes.post('/collection/', authMiddleware, collectionController.postOnCollection) // POST on collection
routes.get('/card/:id', authMiddleware, collectionController.getById); // GET card by it's ID number
routes.delete('/card/:id_collection', authMiddleware, collectionController.deleteById); //DELETE card by it's ID number





///////ROUTES AND REQUISITIONS FOR THE DECKS TABLE
//routes.get('/decks/:id', decksController.getById); // GET decks
routes.get('/decks/:page', authMiddleware, decksController.getDecks); // GET decks
routes.post('/decks', authMiddleware, decksController.postDeck); // POST decks
routes.put('/decks/:id_deck', authMiddleware, decksController.updateDeck); //PUT decks
routes.delete('/decks/:id_deck', authMiddleware, decksController.deleteById);//DELETE decks



///////ROUTES AND REQUISITIONS FOR THE EACHDECK TABLE
routes.get('/eachDeck/:id', authMiddleware, eachDeckController.getDeck); // GET eachDeck
//routes.get('/eachDeck', eachDeckController.getAll); // GET eachDeck
routes.post('/eachDeck', authMiddleware, eachDeckController.postOnDeck); // POST eachDeck
//routes.put('/eachDeck/:id', eachDeckController.update); //PUT eachDeck
routes.delete('/eachDeck/:id_constructed', authMiddleware, eachDeckController.deleteById); //DELETE eachDeck

///////ROUTES AND REQUISITIONS FOR THE WISHLIST TABLE
//routes.get('/wishlist/:id', wishlistController.getById); // GET wishlist
//routes.get('/wishlist', wishlistController.getAll); // GET wishlist
//routes.post('/wishlist', wishlistController.create); // POST wishlist
//routes.put('/wishlist/:id', wishlistController.update); //PUT wishlist
//routes.delete('/wishlist/:id', wishlistController.delete);//DELETE wishlist

///////ROUTES AND REQUISITIONS FOR THE SETS TABLE
routes.get('/sets', setsController.getSets); //GET sets

///////ROUTES AND REQUISITIONS FOR THE USERS TABLE
routes.post('/register', usersController.postUser); //Register user
/* *** */
/* While registering, usersController is also calling email.confirmEmail */
/* *** */
routes.post('/login', usersController.loginUser) //Login user
//routes.post('/reset', usersController.resetPassword); Reset Password



//==============================//ROUTES AND REQUISITIONS FOR [EMAILING] //============================================//
routes.post('/contact', email.contactForm); //Contact email
routes.put('/confirmation/:emailToken', email.checkUserConfirm);
routes.post('/reset', email.resetPassword);
routes.put('/new-password/:resetToken', email.newPassword);



module.exports = routes;