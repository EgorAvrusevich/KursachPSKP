const express = require('express');
const http = require('http');
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
const approvedRoutes = require('./routes/approved.routes')
const savedVacancyRoutes = require('./routes/savedVacancy.routes');
const adminRoutes = require('./routes/admin.routes');
const startChatWorker = require('./workers/chatWorker');
const startMessageWorker = require('./workers/MessageWorker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Лучше указать явно вместо "*"
        methods: ["GET", "POST"],
        credentials: true
    },
});

app.use(express.json());
const PORT = 3000;

app.use('/auth', authRoutes);
app.use('/progress', progressRoutes);
app.use('/interviews', interviewRoutes);
app.use('/vacancies', vacancyRoutes);
app.use('/templates', templateRoutes);
app.use('/applications', applicationRoutes)
app.use('/approved', approvedRoutes)
app.use('/saved-vacancies', savedVacancyRoutes)
app.use('/admin', adminRoutes)

// Логика RabbitMQ
let channel;
async function connectRabbit() {
    const rabbitUrl = `amqp://${process.env.RABBITMQ_HOST || 'rabbitmq'}`;
    const retryDelay = 5000;
    let retryCount = 0;
    const maxRetries = 50; // Максимум 50 попыток (~4 минуты)
    while (true) {
        try {
            const connection = await amqp.connect(rabbitUrl);
            channel = await connection.createChannel();
            await channel.assertQueue('chat_messages', { durable: true });
            console.log('✅ Connected to RabbitMQ');
            break;
        } catch (err) {
            retryCount++;
            if (retryCount >= maxRetries) {
                console.error('❌ Превышено максимальное количество попыток подключения к RabbitMQ');
                process.exit(1);
            }
            console.log(`❌ RabbitMQ not ready, retrying in ${retryDelay / 1000}s... (попытка ${retryCount}/${maxRetries})`);
            await new Promise(res => setTimeout(res, retryDelay));
        }
    }
}


// Socket.io + Sequelize для сохранения сообщений
// Backend (например, server.js)
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    socket.on('join-interview', ({ interviewId, userId, role }) => {
        console.log(`Пользователь ${userId} (${role}) входит в комнату ${interviewId}`);
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

    socket.on('checklist-update', ({ interviewId }) => {
        // .to(id) отправляет всем в комнате
        // .broadcast отправляет всем, КРОМЕ отправителя (чтобы рекрутер сам себя не рефрешил)
        socket.to(`interview-${interviewId}`).emit('checklist-update');
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
            chat_id: chatId,      // Убедись, что фронт ожидает именно sender_id/chat_id
            sender_id: senderId,  // В ChatWindow.jsx у тебя: msg.sender_id === currentUserId
            message_text: text,
            sent_at: new Date(),
            is_system: false
        };

        console.log(`Отправка сообщения в комнату chat_${chatId}`);

        // Используем io.to().emit(), чтобы сообщение получили все в комнате
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

    for (let i = 0; i < 15; i++) {
        try {
            await sequelize.authenticate(); // ПРОВЕРКА 1
            await sequelize.sync();         // ПРОВЕРКА 2
            console.log('✅ Connected to MSSQL & Models Synced');
            connected = true;
            break; // ВЫХОД ИЗ ЦИКЛА
        } catch (error) {
            console.log(`⚠️ DB NOT READY (Attempt ${i + 1}): ${error.message}`);
            console.error(error); // Выведет полный стек ошибки
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