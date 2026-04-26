const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('recruiting_db', 'sa', 'Kv6084242kv!', {
    host: 'recruiting_db', // Хост из docker-compose
    dialect: 'mssql',
    port: 1433,
    dialectOptions: {
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    },
    logging: false
});

module.exports = sequelize;