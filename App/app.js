const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const amqp = require('amqplib');
const { sequelize, ChatMessage } = require('./models'); // Импортируем из нашей папки
const authRoutes = require('./routes/auth.routes');
const progressRoutes = require('./routes/progress.routes');
const interviewRoutes = require('./routes/interview.routes');
const vacancyRoutes = require('./routes/vacancy.routes');
const templateRoutes = require('./routes/template.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
// app.use(cors({
//     origin: 'http://localhost:5173', // Разрешаем фронтенду
//     credentials: true
// }));
const PORT = 3000;

app.use('/auth', authRoutes);
app.use('/progress', progressRoutes);
app.use('/interviews', interviewRoutes);
app.use('/vacancies', vacancyRoutes);
app.use('/templates', templateRoutes);

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
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-interview', ({ interviewId, userId }) => {
        console.log(`User ${userId} joined interview ${interviewId}`);
        socket.join(interviewId);

        // Уведомляем других в комнате, что кто-то подключился
        socket.to(interviewId).emit('user-joined', { userId });
    });

    // Пересылка WebRTC оффера
    socket.on('video-offer', ({ interviewId, offer }) => {
        socket.to(interviewId).emit('video-offer', offer);
    });

    // Пересылка ответа на оффер
    socket.on('video-answer', ({ interviewId, answer }) => {
        socket.to(interviewId).emit('video-answer', answer);
    });

    // Пересылка ICE-кандидатов (технические данные о сетевом пути)
    socket.on('new-ice-candidate', ({ interviewId, candidate }) => {
        socket.to(interviewId).emit('new-ice-candidate', candidate);
    });

    // Завершение звонка
    socket.on('leave-interview', (interviewId) => {
        socket.leave(interviewId);
        socket.to(interviewId).emit('user-left');
    });

    socket.on('send_message', async (data) => {
        try {
            // 1. Сохраняем в MSSQL через Sequelize
            const savedMsg = await ChatMessage.create({
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
                message_text: data.text
            });

            // 2. Отправляем в RabbitMQ для фоновой обработки
            if (channel) {
                channel.sendToQueue('chat_messages', Buffer.from(JSON.stringify(savedMsg)));
            }

            // 3. Рассылаем участникам
            io.emit('receive_message', savedMsg);
        } catch (error) {
            console.error('Ошибка при сохранении сообщения:', error);
        }
    });

    socket.on('disconnect', () => console.log('User disconnected'));
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
    server.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));
}

bootstrap();