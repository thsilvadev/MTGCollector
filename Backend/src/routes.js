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
const scanController = require('./controllers/scanController');
const friendsController = require('./controllers/friendsController');
const profileController = require('./controllers/profileController');
const battlesController = require('./controllers/battlesController');
const aiController = require('./controllers/aiController');
const wishlistController = require('./controllers/wishlistController');

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
routes.delete('/collection/card/:card_id', authMiddleware, collectionController.deleteByCardId); //DELETE N copies of a card by Scryfall UUID





///////ROUTES AND REQUISITIONS FOR THE DECKS TABLE
//routes.get('/decks/:id', decksController.getById); // GET decks
routes.get('/decks/:page', authMiddleware, decksController.getDecks); // GET decks
routes.post('/decks', authMiddleware, decksController.postDeck); // POST decks
routes.put('/decks/:id_deck', authMiddleware, decksController.updateDeck); //PUT decks
routes.delete('/decks/:id_deck', authMiddleware, decksController.deleteById);//DELETE decks



///////ROUTES AND REQUISITIONS FOR THE EACHDECK TABLE
routes.get('/eachDeck/:id', authMiddleware, eachDeckController.getDeck); // GET eachDeck
routes.post('/eachDeck', authMiddleware, eachDeckController.postOnDeck); // POST eachDeck
routes.put('/eachDeck/setqty', authMiddleware, eachDeckController.setQty); // PUT set exact deck card qty
routes.put('/eachDeck/move', authMiddleware, eachDeckController.moveCard); // PUT move card between main deck and sideboard
routes.delete('/eachDeck/:id_constructed', authMiddleware, eachDeckController.deleteById); //DELETE eachDeck

///////ROUTES AND REQUISITIONS FOR AI DECK BUILDER
routes.post('/ai/buildDeck', authMiddleware, aiController.buildDeck); // POST build deck with AI
routes.post('/ai/applyDeck', authMiddleware, aiController.applyDeck); // POST apply AI deck to collection
routes.post('/ai/applyDeckWithWishlist', authMiddleware, aiController.applyDeckWithWishlist); // POST apply AI deck with wishlist matching

///////ROUTES AND REQUISITIONS FOR THE WISHLIST TABLE
routes.get('/wishlist/:id', authMiddleware, wishlistController.getById); // GET wishlist by ID
routes.get('/wishlist', authMiddleware, wishlistController.getAll); // GET all user wishlist items
routes.post('/wishlist', authMiddleware, wishlistController.create); // POST create/update wishlist item
routes.put('/wishlist/:id', authMiddleware, wishlistController.update); // PUT update wishlist item quantity
routes.delete('/wishlist/:id', authMiddleware, wishlistController.delete); // DELETE wishlist item

///////ROUTES AND REQUISITIONS FOR THE SETS TABLE
routes.get('/sets', setsController.getSets); //GET sets

///////ROUTES AND REQUISITIONS FOR THE USERS TABLE
routes.post('/register', usersController.postUser); //Register user
/* *** */
/* While registering, usersController is also calling email.confirmEmail */
/* *** */
routes.post('/resend-confirmation', usersController.resendConfirmation); //Resend confirmation email
routes.post('/login', usersController.loginUser) //Login user
//routes.post('/reset', usersController.resetPassword); Reset Password

///////ROUTES AND REQUISITIONS FOR CARD SCANNER
routes.post('/scan', authMiddleware, scanController.upload, scanController.scan);
routes.post('/detect', authMiddleware, scanController.upload, scanController.detect);
routes.get('/scan/more', authMiddleware, scanController.more);
routes.post('/admin/rebuild-card-db', scanController.rebuildCardDb);



//==============================//ROUTES AND REQUISITIONS FOR [EMAILING] //============================================//
routes.post('/contact', email.contactForm); //Contact email
routes.put('/confirmation/:emailToken', email.checkUserConfirm);
routes.post('/reset', email.resetPassword);
routes.put('/new-password/:resetToken', email.newPassword);

///////ROUTES AND REQUISITIONS FOR FRIENDS
routes.get('/friends/requests', authMiddleware, friendsController.getRequests);   // GET pending requests (specific before generic)
routes.get('/friends/badge', authMiddleware, friendsController.getBadgeCount);     // GET badge count
routes.get('/friends', authMiddleware, friendsController.getFriends);              // GET friends list
routes.post('/friends/request', authMiddleware, friendsController.sendRequest);    // POST send request
routes.put('/friends/request/:id/accept', authMiddleware, friendsController.acceptRequest);   // PUT accept
routes.put('/friends/request/:id/decline', authMiddleware, friendsController.declineRequest); // PUT decline
routes.delete('/friends/:friendId', authMiddleware, friendsController.removeFriend);           // DELETE unfriend

///////ROUTES AND REQUISITIONS FOR PROFILE
routes.get('/profile/:userId',                         authMiddleware, profileController.getProfile);
routes.get('/profile/:userId/decks',                   authMiddleware, profileController.getProfileDecks);
routes.get('/profile/:userId/testimonials',            authMiddleware, profileController.getTestimonials);
routes.post('/profile/:userId/testimonials',           authMiddleware, profileController.addTestimonial);

///////ROUTES AND REQUISITIONS FOR BATTLES
routes.get('/battles',                    authMiddleware, battlesController.getMyBattles);
routes.post('/battles',                   authMiddleware, battlesController.declareBattle);
routes.put('/battles/:id/accept',         authMiddleware, battlesController.acceptBattle);
routes.put('/battles/:id/decline',        authMiddleware, battlesController.declineBattle);


module.exports = routes;