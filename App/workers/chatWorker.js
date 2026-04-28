const amqp = require('amqplib');
const { Chat, ChatMessage } = require('../models');

async function startChatWorker() {
    try {
        const host = process.env.RABBITMQ_HOST || 'localhost';
        const connection = await amqp.connect(`amqp://${host}`);
        const channel = await connection.createChannel();
        const queue = 'application_accepted';

        await channel.assertQueue(queue, { durable: true });
        // Ограничиваем воркер: обрабатывать только 1 сообщение за раз
        channel.prefetch(1);

        console.log(`[*] Воркер запущен. Ожидание сообщений в очереди: ${queue}`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log(`[MQ] Получены данные:`, data);

                try {
                    // 1. Создаем чат для отклика (если вдруг еще нет)
                    const [chat] = await Chat.findOrCreate({
                        where: { application_id: data.applicationId }
                    });

                    // 2. Создаем системное сообщение от имени рекрутера
                    await ChatMessage.create({
                        chat_id: chat.ChatId,
                        sender_id: data.recruiterId,
                        message_text: "Поздравляем! Ваш отклик принят. Здесь мы можем обсудить детали и назначить интервью.",
                        is_system: true
                    });

                    console.log(`[MQ] Чат успешно создан для ApplicationId: ${data.applicationId}`);
                    
                    // Подтверждаем RabbitMQ, что сообщение обработано
                    channel.ack(msg);
                } catch (dbError) {
                    console.error("[MQ] Ошибка БД в воркере:", dbError);
                    // Возвращаем в очередь, чтобы попробовать позже (через некоторое время)
                    setTimeout(() => channel.nack(msg), 5000);
                }
            }
        });
    } catch (error) {
        console.error("[MQ] Критическая ошибка воркера:", error);
    }
}

module.exports = startChatWorker;