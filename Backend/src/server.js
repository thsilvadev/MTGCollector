const express = require('express');
const cors = require('cors');

const app = express();
const routes = require('./routes');

const port = 3344;
const ip = '127.0.0.1';

app.use(cors());
app.use(express.json()); // Tells express that the response will be in JSON

app.use(routes); // Use routes provided by controllers

app.listen(port, ip, () => {

    console.log(`Server is on - Running at http://${ip}:${port}/   !!`)
})
