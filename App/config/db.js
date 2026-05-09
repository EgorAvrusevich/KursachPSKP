const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'recruiting_db', 
    'sa', 
    process.env.DB_PASSWORD || 'Kv6084242kv!', 
    {
        // ВАЖНО: здесь должен быть 'db', так как это имя сервиса в docker-compose
        host: process.env.DB_HOST || 'db', 
        dialect: 'mssql',
        port: parseInt(process.env.DB_PORT) || 1433,
        dialectOptions: {
            options: {
                encrypt: true,
                trustServerCertificate: true // Это ты добавил верно, это нужно для Docker
            }
        },
        logging: false
    }
);

module.exports = sequelize;