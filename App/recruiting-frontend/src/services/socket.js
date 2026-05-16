import { io } from 'socket.io-client';

const socket = io('/', {
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket', 'polling']
});

// Добавим логи для отладки
socket.on('connect', () => {
    console.log('✅ Connected to WebSocket, ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
});

export default socket;