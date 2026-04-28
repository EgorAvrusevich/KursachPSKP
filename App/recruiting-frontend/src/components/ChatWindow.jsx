import React, { useState, useEffect, useRef } from 'react';
import socket from '../services/socket';
import api from '../api'; // Твой настроенный axios
import { Send, User, Bot } from 'lucide-react';

const ChatWindow = ({ applicationId, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [chatId, setChatId] = useState(null);
    const scrollRef = useRef();

    // 1. Загрузка истории и подключение к комнате
    useEffect(() => {
        const fetchChat = async () => {
            try {
                const res = await api.get(`/applications/${applicationId}`);
                const fetchedChatId = res.data.ChatId;
                setChatId(fetchedChatId);
                setMessages(res.data.ChatMessages || []);

                socket.connect();
                // Сообщаем серверу, что мы хотим слушать именно этот чат
                socket.emit("join_chat", fetchedChatId);
            } catch (err) {
                console.error("Ошибка загрузки чата", err);
            }
        };

        fetchChat();

        // Слушаем входящие сообщения
        const handleNewMessage = (message) => {
            setMessages((prev) => {
                // Если сообщение с таким ID уже есть (например, мы его сами отправили), не добавляем
                const exists = prev.find(m => m.MessageId === message.MessageId);
                if (exists) return prev;
                return [...prev, message];
            });
        };

        socket.on("new_message", handleNewMessage);

        return () => {
            socket.off("new_message", handleNewMessage);
            // Если сокет глобальный, disconnect() может убить другие чаты, 
            // лучше использовать socket.emit("leave_chat", chatId)
            socket.disconnect();
        };
    }, [applicationId]);

    // Автопрокрутка вниз
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        // Если нет текста, нет чата ИЛИ нет ID пользователя — ничего не шлем
        if (!input.trim() || !chatId || !currentUserId) {
            console.error("❌ Невозможно отправить: данные не полные", {
                chatId,
                currentUserId,
                hasText: !!input.trim()
            });
            return;
        }

        const messageData = {
            chatId,
            senderId: currentUserId,
            text: input
        };

        socket.emit("send_message", messageData);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[500px] w-full bg-white border rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-slate-50 font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Чат по вакансии
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    const isSystem = msg.is_system;

                    if (isSystem) {
                        return (
                            <div key={msg.MessageId} className="flex justify-center">
                                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs px-4 py-2 rounded-full flex items-center gap-2">
                                    <Bot size={14} />
                                    {msg.message_text}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.MessageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-blue-100' : 'bg-slate-200'}`}>
                                    <User size={16} className={isMe ? 'text-blue-600' : 'text-slate-600'} />
                                </div>
                                <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'
                                    } shadow-sm`}>
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