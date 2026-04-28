const amqp = require('amqplib');
const { Chat, ChatMessage } = require('../models');

async function startChatWorker() {
    try {
        const host = process.env.RABBITMQ_HOST || 'localhost';
        const connection = await amqp.connect(`amqp://${host}`);
        const channel = await connection.createChannel();
        const queue = 'application_accepted'; // Название очереди

        await channel.assertQueue(queue, { durable: true });
        channel.prefetch(1);

        console.log(`[*] Воркер запущен. Ожидание в очереди: ${queue}`);

        // СЛУШАЕМ ТУ ЖЕ ОЧЕРЕДЬ, ЧТО И ОБЪЯВИЛИ
        channel.consume(queue, async (msg) => {
            if (!msg) return;
            const data = JSON.parse(msg.content.toString());
            const { applicationId, candidateId, recruiterId } = data;

            try {
                const [chat, created] = await Chat.findOrCreate({
                    where: { application_id: applicationId },
                    defaults: { application_id: applicationId }
                });

                if (created) {
                    // Логируем для отладки, чтобы увидеть, какой ID пришел от базы
                    console.log(`Создан чат с ID: ${chat.ChatId} для заявки: ${applicationId}`);

                    await ChatMessage.create({
                        // Используем явное обращение. 
                        // Если в модели ChatId, то пишем ChatId.
                        chat_id: chat.ChatId,
                        sender_id: recruiterId,
                        message_text: 'Ваш отклик одобрен! Теперь вы можете общаться с рекрутером здесь.',
                        is_system: true,
                        sent_at: new Date()
                    });

                    console.log(`✅ Приветственное сообщение создано для чата ${chat.ChatId}`);
                } else {
                    console.log(`ℹ️ Чат для заявки ${applicationId} уже существовал.`);
                }

                channel.ack(msg);
            } catch (err) {
                console.error("❌ Ошибка в воркере при создании сообщения:", err);
                // Если ошибка не временная (например, ValidationError), подтверждаем, чтобы не зацикливать
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error("[MQ] Критическая ошибка воркера:", error);
    }
}

module.exports = startChatWorker;