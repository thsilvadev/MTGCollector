const express = require('express');
const cors    = require('cors');
require('dotenv').config({ path: './.env' });

const app    = express();
const routes = require('./routes');

const port = process.env.PORT || 3000;
const ip   = process.env.IP   || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(port, ip, () => {
  console.log(`Server running at http://${ip}:${port}/`);
});
