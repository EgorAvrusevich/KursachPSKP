import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost';

const socket = io(SOCKET_URL, {
    autoConnect: false, // Чтобы не подключаться сразу при импорте
    withCredentials: true,
    transports: ['websocket', 'polling'] // Для стабильности
});

// Добавим логи для отладки
socket.on('connect', () => {
    console.log('✅ Connected to WebSocket, ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
});

export default socket;