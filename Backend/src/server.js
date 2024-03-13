const express = require('express');
const cors = require('cors');
require(`dotenv`).config({path: './.env'});
//SSL
const fs = require('fs');
const https = require('https');




const app = express();
const routes = require('./routes');

const port = 80;
const ip = '172.31.12.117';



app.use(cors());
app.use(express.json()); // Tells express that the response will be in JSON

app.use(routes); // Use routes provided by controllers

app.listen(port, ip, () => {

    console.log(`Server is on - Running at http://${ip}:${port}/   !!`)
})


https.createServer({
    cert: fs.readFileSync('src/ssl/code.crt'),
    key: fs.readFileSync('src/ssl/code.key')
}, app).listen(443, () => console.log("Runnning in https"))

