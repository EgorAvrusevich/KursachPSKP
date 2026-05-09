const amqp = require('amqplib');

let sharedConnection = null;
let sharedChannel = null;

async function getRabbitMQChannel() {
    if (sharedChannel) {
        return sharedChannel;
    }

    try {
        const host = process.env.RABBITMQ_HOST || 'localhost';
        sharedConnection = await amqp.connect(`amqp://${host}`);
        sharedChannel = await sharedConnection.createChannel();
        
        // Обработка закрытия соединения
        sharedConnection.on('close', () => {
            console.log('[MQ] Соединение RabbitMQ закрыто, очищаем кэш');
            sharedConnection = null;
            sharedChannel = null;
        });
        
        sharedConnection.on('error', (err) => {
            console.error('[MQ] Ошибка соединения RabbitMQ:', err.message);
            sharedConnection = null;
            sharedChannel = null;
        });

        console.log('[MQ] Установлено новое соединение с RabbitMQ');
        return sharedChannel;
    } catch (error) {
        console.error('[MQ] Ошибка подключения к RabbitMQ:', error);
        sharedConnection = null;
        sharedChannel = null;
        throw error;
    }
}

async function publishEvent(queue, data) {
    let channel;
    try {
        channel = await getRabbitMQChannel();
        await channel.assertQueue(queue, { durable: true });
        
        const result = channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
            persistent: true // Сообщение не пропадет при перезагрузке очереди
        });

        if (!result) {
            console.warn(`[MQ] Очередь ${queue} переполнена, ожидаем drain`);
            await new Promise((resolve) => channel.once('drain', resolve));
        }

        console.log(`[MQ] Событие отправлено в очередь ${queue}`);
    } catch (error) {
        console.error("[MQ] Ошибка отправки события:", error);
        // При ошибке очищаем кэш, чтобы следующее сообщение создало новое соединение
        sharedConnection = null;
        sharedChannel = null;
    }
}

module.exports = { publishEvent };


