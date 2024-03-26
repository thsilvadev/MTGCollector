const Dotenv = require('dotenv-webpack');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new Dotenv()
      ],
    },
  },
};