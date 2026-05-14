import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем для перехода
import socket from '../services/socket';
import api from '../api';
import { Send, User, Bot, Video } from 'lucide-react'; // Добавил иконку Video
import Button from '../components/ui/Button'; // Предположим, у тебя есть UI-кнопка

const ChatWindow = ({ applicationId, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [chatId, setChatId] = useState(null);
    const scrollRef = useRef();
    const navigate = useNavigate(); // Хук для навигации

    useEffect(() => {
        let isMounted = true;

        if (!socket.connected) {
            socket.connect(); // Включаем сокет вручную
        }

        const fetchChat = async () => {
            try {
                const res = await api.get(`/applications/${applicationId}`);
                if (!isMounted) return;

                const cid = res.data.ChatId;
                setChatId(cid);
                setMessages(res.data.ChatMessages || []);

                // Функция-обертка для входа в комнату
                const joinRoom = () => {
                    console.log("✅ Сокет готов, входим в комнату:", cid);
                    socket.emit("join_chat", cid);
                };

                if (socket.connected) {
                    joinRoom();
                } else {
                    console.log("⏳ Сокет в ожидании, подписываемся на коннект...");
                    // Используем .once, чтобы не плодить слушателей
                    socket.once('connect', joinRoom);
                }
            } catch (err) {
                console.error("Ошибка загрузки чата", err);
            }
        };

        fetchChat();

        const handleNewMessage = (message) => {
            setMessages(prev => [...prev, message]);
        };

        socket.on("new_message", handleNewMessage);

        // Дополнительные логи для отладки в реальном времени
        const onConnect = () => console.log("🌐 Socket Connected!", socket.id);
        const onDisconnect = () => console.log("🌐 Socket Disconnected");

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        return () => {
            isMounted = false;
            socket.off("new_message", handleNewMessage);
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            // Убираем временный слушатель, если компонент размонтировался до коннекта
            socket.off('connect');
            if (chatId) socket.emit("leave_chat", chatId);
        };
    }, [applicationId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        console.log("Данные перед отправкой:", { input, chatId, currentUserId }); // ЛОГ ДЛЯ ТЕСТА
        if (!input.trim() || !chatId || !currentUserId) {
            console.error("Отправка прервана: пустое поле или нет ID");
            return;
        }
        if (input.trim().length > 5000) {
            alert("Сообщение слишком длинное (макс. 5000 символов)");
            return;
        }

        const messageData = {
            chatId,
            senderId: currentUserId,
            text: input.trim()
        };

        socket.emit("send_message", messageData);
        setInput('');
    };

    // ФУНКЦИЯ ДЛЯ ПРОВЕРКИ И ПАРСИНГА ССЫЛКИ
    const renderMessageContent = (msg) => {
        const isInterviewLink = msg.is_system && msg.message_text.includes('/interview/');

        if (isInterviewLink) {
            // Извлекаем путь (например, /interview/42) из текста
            const linkMatch = msg.message_text.match(/\/interview\/\d+/);
            const link = linkMatch ? linkMatch[0] : null;
            const cleanText = msg.message_text.split('Присоединиться')[0]; // Убираем сырую ссылку из текста

            return (
                <div className="flex flex-col gap-3">
                    <p className="font-semibold text-slate-800">{cleanText}</p>
                    {link && (
                        <button
                            onClick={() => navigate(link)}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition-all shadow-sm font-bold text-xs"
                        >
                            <Video size={16} />
                            Войти в комнату встреч
                        </button>
                    )}
                </div>
            );
        }

        return msg.message_text;
    };

    return (
        <div className="flex flex-col h-[500px] w-full bg-white border rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-slate-50 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Чат по вакансии
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    const isSystem = msg.is_system;

                    if (isSystem) {
                        return (
                            <div key={msg.MessageId || Math.random()} className="flex justify-center">
                                <div className={`max-w-[90%] bg-white border border-blue-100 p-4 rounded-2xl shadow-sm flex gap-3`}>
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                        <Bot size={20} className="text-blue-600" />
                                    </div>
                                    <div className="text-sm">
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.MessageId || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-blue-100' : 'bg-slate-200'}`}>
                                    <User size={16} className={isMe ? 'text-blue-600' : 'text-slate-600'} />
                                </div>
                                <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'} shadow-sm`}>
                                    {msg.message_text}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Напишите сообщение..."
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                    onClick={sendMessage}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;