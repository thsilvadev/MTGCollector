//INSERE AS INFORMAÇÕES DO BANCO DE DADOS
require(`dotenv`).config();

module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.HOST,
            user: process.env.DB_USER,
            password: process.env.PASSWORD,
            database: process.env.DATABASE
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 600000,
            afterCreate: function (conn, done) {
                conn.query('SELECT 1', function (err) {
                    done(err, conn);
                });
            }
        }
    }
}