const amqp = require('amqplib');

async function publishEvent(queue, data) {
    let connection;
    try {
        // Используем хост из окружения (в Docker это 'rabbitmq')
        const host = process.env.RABBITMQ_HOST || 'localhost';
        connection = await amqp.connect(`amqp://${host}`);
        const channel = await connection.createChannel();

        await channel.assertQueue(queue, { durable: true });
        
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
            persistent: true // Сообщение не пропадет при перезагрузке очереди
        });

        console.log(`[MQ] Событие отправлено в очередь ${queue}`);
        
        await channel.close();
    } catch (error) {
        console.error("[MQ] Ошибка отправки события:", error);
    } finally {
        if (connection) await connection.close();
    }
}



module.exports = { publishEvent };