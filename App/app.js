const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const amqp = require('amqplib');
const { publishEvent } = require('./services/mqService');
const { sequelize, ChatMessage } = require('./models'); // Импортируем из нашей папки
const authRoutes = require('./routes/auth.routes');
const progressRoutes = require('./routes/progress.routes');
const interviewRoutes = require('./routes/interview.routes');
const vacancyRoutes = require('./routes/vacancy.routes');
const applicationRoutes = require('./routes/application.routes')
const templateRoutes = require('./routes/template.routes');
const startChatWorker = require('./workers/chatWorker');
const startMessageWorker = require('./workers/MessageWorker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
const PORT = 3000;

app.use('/auth', authRoutes);
app.use('/progress', progressRoutes);
app.use('/interviews', interviewRoutes);
app.use('/vacancies', vacancyRoutes);
app.use('/templates', templateRoutes);
app.use('/applications', applicationRoutes)

// Логика RabbitMQ
let channel;
async function connectRabbit() {
    const rabbitUrl = `amqp://${process.env.RABBITMQ_HOST || 'rabbitmq'}`;
    const retryDelay = 5000;
    while (true) {
        try {
            const connection = await amqp.connect(rabbitUrl);
            channel = await connection.createChannel();
            await channel.assertQueue('chat_messages', { durable: true });
            console.log('✅ Connected to RabbitMQ');
            break;
        } catch (err) {
            console.log(`❌ RabbitMQ not ready, retrying in ${retryDelay / 1000}s...`);
            await new Promise(res => setTimeout(res, retryDelay));
        }
    }
}

// Socket.io + Sequelize для сохранения сообщений
// Backend (например, server.js)
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    socket.on('join-interview', ({ interviewId, userId, role }) => {
        if (!userId) return;

        const roomName = `interview-${interviewId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined room: ${roomName}`);

        // Оповещаем ВСЕХ КРОМЕ отправителя в этой комнате
        socket.to(roomName).emit('user-joined', { userId, role });
    });

    // Когда кто-то меняет статус (микро/видео)
    socket.on('update-media-status', ({ interviewId, status }) => {
        socket.to(`interview-${interviewId}`).emit('status-update', status);
    });

    // Прямой обмен статусами при подключении
    socket.on('share-status', ({ interviewId, status }) => {
        socket.to(`interview-${interviewId}`).emit('status-update', status);
    });

    // Проброс видео-сигналов
    socket.on('video-offer', ({ interviewId, offer }) => {
        socket.to(`interview-${interviewId}`).emit('video-offer', offer);
    });

    socket.on('video-answer', ({ interviewId, answer }) => {
        socket.to(`interview-${interviewId}`).emit('video-answer', answer);
    });

    socket.on('new-ice-candidate', ({ interviewId, candidate }) => {
        socket.to(`interview-${interviewId}`).emit('new-ice-candidate', candidate);
    });

    socket.on("join_chat", (chatId) => {
        const roomName = `chat_${chatId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined chat room: ${roomName}`);
    });

    socket.on("send_message", async (data) => {
        const { chatId, senderId, text } = data;

        const messageToBroadcast = {
            MessageId: Date.now(),
            chat_id: chatId,      // Убедись, что на фронте msg.chat_id или подправь под msg.ChatId
            sender_id: senderId,
            message_text: text,
            sent_at: new Date(),
            is_system: false
        };

        // Рассылаем всем в комнату chat_{id}
        io.to(`chat_${chatId}`).emit("new_message", messageToBroadcast);

        try {
            await publishEvent('chat_messages', {
                chatId,
                senderId,
                text,
                sentAt: messageToBroadcast.sent_at
            });
        } catch (err) {
            console.error("Ошибка RabbitMQ:", err);
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: 'connected', rabbitmq: channel ? 'connected' : 'connecting' });
});

async function bootstrap() {
    // Ожидание и синхронизация БД
    let connected = false;

    for (let i = 0; i < 15; i++) { // Увеличь до 15 попыток
        try {
            // 1. Сначала просто проверяем, отвечает ли сервер (через master)
            await sequelize.authenticate();

            // 2. Пытаемся синхронизировать модели
            // Если база еще "просыпается", ошибка вылетит здесь
            await sequelize.sync();

            console.log('✅ Connected to MSSQL & Models Synced');
            connected = true;
            break;
        } catch (error) {
            console.log(`⚠️ DB NOT READY (Attempt ${i + 1}): ${error.message}`);
            // Ждем чуть дольше между попытками
            await new Promise(res => setTimeout(res, 7000));
        }
    }

    if (!connected) {
        console.error('❌ Could not connect to DB after 15 attempts');
        process.exit(1);
    }

    await connectRabbit();
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        startChatWorker(); // Запуск слушателя RabbitMQ
        startMessageWorker();
    });
}

bootstrap();