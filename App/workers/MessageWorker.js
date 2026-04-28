// workers/messageWorker.js
const amqp = require('amqplib');
const { ChatMessage } = require('../models');

async function startMessageWorker() {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const connection = await amqp.connect(`amqp://${host}`);
    const channel = await connection.createChannel();
    const queue = 'chat_messages';

    await channel.assertQueue(queue, { durable: true });
    console.log(`[*] Воркер запущен. Ожидание в очереди: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (!msg) return;
        const content = msg.content.toString();
        const data = JSON.parse(content);

        // ЛОГ ДЛЯ ОТЛАДКИ: Посмотри в консоль докера, что реально пришло
        console.log("Получены данные из очереди:", data);

        // ВАЖНО: Проверь соответствие имен (senderId vs sender_id)
        const chatId = data.chatId || data.chat_id;
        const senderId = data.senderId || data.sender_id;
        const text = data.text || data.message_text;

        try {
            if (!senderId) {
                throw new Error("sender_id is missing in RabbitMQ message");
            }

            await ChatMessage.create({
                chat_id: chatId,
                sender_id: senderId,
                message_text: text,
                sent_at: data.sentAt || new Date(),
                is_system: false
            });

            channel.ack(msg);
        } catch (err) {
            console.error("❌ Ошибка сохранения сообщения:", err.message);

            // КРИТИЧЕСКИЙ МОМЕНТ: Если данные битые (нет ID), 
            // мы делаем ack, чтобы сообщение УДАЛИЛОСЬ и не вешало докер
            if (err.name === 'SequelizeValidationError' || !senderId) {
                console.log("Удаляем битое сообщение из очереди");
                channel.ack(msg);
            } else {
                // Если ошибка временная (база упала), возвращаем в очередь
                channel.nack(msg, false, true);
            }
        }
    });
}

module.exports = startMessageWorker;