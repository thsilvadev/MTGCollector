const express = require('express');

/////////// CONTROLLERS //////////////

const cardsController = require('./controllers/cardsController');
const collectionController = require('./controllers/collectionController');

/*
const collectionController = require('./controllers/collectionController');
const decksController = require('./controllers/decksController');
const eachDeckController = require('./controllers/eachDeckController');
const wishlistController = require('./controllers/wishlistController');

*/



//Controller requests and it's responses will go to routes
const routes = express.Router();


///////ROUTES AND REQUISITIONS FOR THE CARDS TABLE
routes.get('/card/:id', cardsController.getById); // GET card by it's ID number
routes.get('/cards/:page', cardsController.getAll); // GET cards
routes.get('/cards/set/:set/:page', cardsController.getBySet);

//routes.copy('/cards/:id', cardsController.copy); //COPY cards








///////ROUTES AND REQUISITIONS FOR THE COLLECTION TABLE 
routes.get('/collection/:page', collectionController.getCollection); // GET collection
routes.post('/collection/', collectionController.PostOnCollection) // POST on collection



/*

///////ROUTES AND REQUISITIONS FOR THE DECKS TABLE
routes.get('/decks/:id', decksController.getById); // GET decks
routes.get('/decks', decksController.getAll); // GET decks
routes.post('/decks', decksController.create); // POST decks
routes.put('/decks/:id', decksController.update); //PUT decks
routes.delete('/decks/:id', decksController.delete);//DELETE decks

///////ROUTES AND REQUISITIONS FOR THE EACHDECK TABLE
routes.get('/eachDeck/:id', eachDeckController.getById); // GET eachDeck
routes.get('/eachDeck', eachDeckController.getAll); // GET eachDeck
routes.post('/eachDeck', eachDeckController.create); // POST eachDeck
routes.put('/eachDeck/:id', eachDeckController.update); //PUT eachDeck
routes.delete('/eachDeck/:id', eachDeckController.delete);//DELETE eachDeck

///////ROUTES AND REQUISITIONS FOR THE WISHLIST TABLE
routes.get('/wishlist/:id', wishlistController.getById); // GET wishlist
routes.get('/wishlist', wishlistController.getAll); // GET wishlist
routes.post('/wishlist', wishlistController.create); // POST wishlist
routes.put('/wishlist/:id', wishlistController.update); //PUT wishlist
routes.delete('/wishlist/:id', wishlistController.delete);//DELETE wishlist
*/





module.exports = routes;