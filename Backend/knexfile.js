//INSERE AS INFORMAÇÕES DO BANCO DE DADOS

module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host:'localhost',
            user:'root',
            password:'',
            database:'mtg'
        }
    }
}