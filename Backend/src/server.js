const express = require('express');
const cors = require('cors');

const app = express();
const routes = require('./routes');

app.use(cors());
app.use(express.json()); // Tells express that the response will be in JSON

app.use(routes); // Use routes provided by controllers

app.listen(3344, () => console.log('Servidor ON - Rodando na porta 3344 !!'));