import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import api from '../api';
import { Card } from '../components/ui/Card';
import {
    PhoneOff, Mic, MicOff, Video, VideoOff,
    CheckCircle2, Loader2, Eye, EyeOff, User, ShieldCheck,
    MessageSquare, ListChecks, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InterviewPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [interviewData, setInterviewData] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('checklist');

    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [showComments, setShowComments] = useState(false);

    const [remoteStatus, setRemoteStatus] = useState({
        isMicOn: true,
        isVideoOn: true,
        role: null,
        joined: false
    });

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const pc = useRef(null);
    const localStreamRef = useRef(null);
    const isNegotiating = useRef(false);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatId, setChatId] = useState(null);
    const chatScrollRef = useRef();

    const VideoPlaceholder = () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 z-10">
            <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-600 shadow-xl">
                <User size={48} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Камера выключена</p>
        </div>
    );

    const tokenData = useMemo(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { id: payload.id, role: payload.role };
        } catch { return null; }
    }, []);

    const currentUserId = user?.id || tokenData?.id;
    const currentUserRole = user?.role || tokenData?.role;

    const fetchChecklist = useCallback(async () => {
        try {
            const res = await api.get(`/interviews/${id}`);
            setChecklist(res.data?.Application?.CandidateProgresses || []);
            setShowComments(res.data.show_comments_to_candidate);
        } catch (err) {
            console.error("Ошибка обновления чек-листа:", err);
        }
    }, [id]);

    const loadChat = useCallback(async (appId) => {
        try {
            const chatRes = await api.get(`/applications/${appId}/chat`);
            if (chatRes.data) {
                setChatId(chatRes.data.ChatId);
                setMessages(chatRes.data.ChatMessages || []);
                return true;
            }
        } catch (chatErr) {
            setChatId(null);
            setMessages([]);
        }
        return false;
    }, []);

    const loadChatRef = useRef(loadChat);
    useEffect(() => { loadChatRef.current = loadChat; }, [loadChat]);

    const handleCreateChat = async () => {
        const appId = interviewData?.Application?.ApplicationId;
        if (!appId) return;
        try {
            const res = await api.post(`/applications/${appId}/chat`);
            if (res.data?.ChatId) {
                setChatId(res.data.ChatId);
                setMessages([]);
                if (socket.connected) {
                    socket.emit('join_chat', res.data.ChatId);
                }
            }
        } catch (err) {
            console.error("Ошибка создания чата:", err);
            alert("Не удалось создать чат");
        }
    };

    const fetchChecklistRef = useRef(fetchChecklist);
    useEffect(() => { fetchChecklistRef.current = fetchChecklist; }, [fetchChecklist]);

    // Загрузка данных интервью и чата
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/interviews/${id}`);
                const data = res.data;
                setInterviewData(data);

                const progressStages = data?.Application?.CandidateProgresses;
                const templateStages = data?.Application?.Vacancy?.CheckListTemplates;
                const stages = progressStages && progressStages.length > 0 ? progressStages : templateStages || [];
                setChecklist(stages);
                setShowComments(data.show_comments_to_candidate);

                // Загружаем чат
                const appId = data?.Application?.ApplicationId;
                if (appId) {
                    await loadChatRef.current(appId);
                }

                setLoading(false);
            } catch (err) {
                console.error("Ошибка загрузки:", err);
                if (err.response?.status === 401) navigate('/login');
            }
        };
        fetchData();
    }, [id, navigate]);

    // WebRTC и Socket
    useEffect(() => {
        if (!user || !currentUserId || !id) return;

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.current = peerConnection;

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('new-ice-candidate', { interviewId: id, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

                socket.connect();
                socket.emit('join-interview', {
                    interviewId: id,
                    userId: currentUserId,
                    role: user.role,
                    mediaStatus: { isMicOn: true, isVideoOn: true }
                });

                // Подключаемся к чат-комнате
                if (chatId) {
                    socket.emit('join_chat', chatId);
                }
            })
            .catch(err => console.error("Ошибка доступа к камере/микрофону:", err));

        socket.on('user-joined', async (data) => {
            setRemoteStatus(prev => ({ ...prev, role: data.role, joined: true }));
            socket.emit('share-status', {
                interviewId: id,
                status: { isMicOn: true, isVideoOn: true, role: user.role }
            });

            if (isNegotiating.current) return;
            isNegotiating.current = true;
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('video-offer', { interviewId: id, offer });
            } catch (e) {
                console.error("Ошибка создания offer:", e);
                isNegotiating.current = false;
            }
        });

        socket.on('status-update', (status) => {
            setRemoteStatus(prev => ({ ...prev, ...status, joined: true }));
        });

        socket.on('video-offer', async (offer) => {
            if (isNegotiating.current) return;
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('video-answer', { interviewId: id, answer });
            } catch (e) {
                console.error("Ошибка обработки offer:", e);
            }
        });

        socket.on('video-answer', async (answer) => {
            if (!isNegotiating.current) return;
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (e) {
                console.error("Ошибка обработки answer:", e);
            } finally {
                isNegotiating.current = false;
            }
        });

        socket.on('new-ice-candidate', async (candidate) => {
            try {
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (e) { console.error(e); }
        });

        socket.on('settings-update', (data) => {
            setShowComments(data.showComments);
        });

        socket.on('checklist-update', () => {
            if (fetchChecklistRef.current) fetchChecklistRef.current();
        });

        // Обработчик сообщений чата
        socket.on('new_message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            socket.off('user-joined');
            socket.off('status-update');
            socket.off('video-offer');
            socket.off('video-answer');
            socket.off('settings-update');
            socket.off('checklist-update');
            socket.off('new-ice-candidate');
            socket.off('new_message');
            socket.disconnect();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            peerConnection.close();
        };
    }, [id, user?.role, chatId]);

    // Подключаемся к чат-комнате при появлении chatId
    useEffect(() => {
        if (!chatId) return;
        if (socket.connected) {
            socket.emit('join_chat', chatId);
        } else {
            socket.connect();
            socket.on('connect', () => {
                socket.emit('join_chat', chatId);
            });
        }
    }, [chatId]);

    // Периодическая проверка чата (если ещё не создан)
    useEffect(() => {
        if (chatId) return;
        const appId = interviewData?.Application?.ApplicationId;
        if (!appId) return;
        const interval = setInterval(() => {
            loadChatRef.current(appId);
        }, 15000);
        return () => clearInterval(interval);
    }, [chatId, interviewData]);

    // Прокрутка чата
    useEffect(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const toggleMic = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            const newStatus = !audioTrack.enabled;
            audioTrack.enabled = newStatus;
            setIsMicOn(newStatus);
            socket.emit('update-media-status', { interviewId: id, status: { isMicOn: newStatus, isVideoOn } });
        }
    };

    const toggleVideo = () => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            const newStatus = !videoTrack.enabled;
            videoTrack.enabled = newStatus;
            setIsVideoOn(newStatus);
            socket.emit('update-media-status', { interviewId: id, status: { isMicOn, isVideoOn: newStatus } });
        }
    };

    const handleToggleComments = async () => {
        if (user?.role !== 'Recruiter') return;
        const newValue = !showComments;
        try {
            await api.patch(`/interviews/${id}/settings`, { show_comments_to_candidate: newValue });
            setShowComments(newValue);
            socket.emit('settings-update', { interviewId: id, showComments: newValue });
            socket.emit('checklist-update', { interviewId: id });
        } catch (err) {
            console.error("Ошибка при сохранении настроек:", err);
        }
    };

    const handleEndCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        navigate(user.role === 'Recruiter' ? '/my-vacancies' : '/my-applications');
    };

    // Отправка сообщения в чат
    const sendChatMessage = () => {
        const text = chatInput.trim();
        if (!text || !chatId || !currentUserId) return;
        if (text.length > 5000) {
            alert("Сообщение слишком длинное (макс. 5000 символов)");
            return;
        }
        socket.emit('send_message', { chatId, senderId: currentUserId, text });
        setChatInput('');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="font-bold text-slate-600 uppercase tracking-widest text-xs">Подключение к сессии...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 p-4 bg-[#F8FAFC] overflow-hidden">
            {/* ВИДЕО-КОНФЕРЕНЦИЯ */}
            <div className="flex-grow flex flex-col gap-4 min-w-0">
                <div className="relative flex-grow grid grid-cols-2 gap-4 bg-slate-950 rounded-[2.5rem] p-4 shadow-2xl border border-slate-800">
                    {/* МОЕ ВИДЕО */}
                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-video self-center border border-slate-800/50">
                        {!isVideoOn && <VideoPlaceholder />}
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`} />
                        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-white text-[11px] font-bold border border-white/10">
                            {user?.role === 'Recruiter' ? <ShieldCheck size={14} className="text-blue-400" /> : <User size={14} />}
                            ВЫ ({user?.role === 'Recruiter' ? 'РЕКРУТЕР' : 'КАНДИДАТ'})
                            {!isMicOn && <MicOff size={12} className="text-red-500 ml-1" />}
                        </div>
                    </div>

                    {/* ВИДЕО СОБЕСЕДНИКА */}
                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-video self-center flex items-center justify-center border border-slate-800/50">
                        {!remoteStatus.joined ? (
                            <div className="text-center animate-pulse">
                                <User size={48} className="mx-auto text-slate-700 mb-2" />
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Ожидание участника...</p>
                            </div>
                        ) : (
                            <>
                                {!remoteStatus.isVideoOn && <VideoPlaceholder />}
                                <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover transition-opacity duration-500 ${!remoteStatus.isVideoOn ? 'opacity-0' : 'opacity-100'}`} />
                                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-white text-[11px] font-bold border border-white/10 uppercase">
                                    {remoteStatus.role === 'Recruiter' ? <ShieldCheck size={14} className="text-blue-400" /> : <User size={14} />}
                                    {remoteStatus.role}
                                </div>
                                {!remoteStatus.isMicOn && (
                                    <div className="absolute top-4 right-4 z-20 bg-red-500/20 backdrop-blur-md border border-red-500/50 p-2 rounded-xl text-red-500">
                                        <MicOff size={18} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* УПРАВЛЕНИЕ */}
                <div className="h-24 flex-shrink-0 flex justify-center items-center gap-6 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl">
                    <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all active:scale-90 ${isMicOn ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-500 text-white shadow-lg'}`}>
                        {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                    <button onClick={handleEndCall} className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-[1.25rem] font-black uppercase text-xs tracking-widest transition-all">
                        Завершить
                    </button>
                    <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all active:scale-90 ${isVideoOn ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-500 text-white shadow-lg'}`}>
                        {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>
                </div>
            </div>

            {/* ПАНЕЛЬ СПРАВА: ЧЕК-ЛИСТ + ЧАТ */}
            <Card className="w-96 flex-shrink-0 flex flex-col shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
                {/* Вкладки */}
                <div className="flex border-b border-slate-100 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('checklist')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'checklist' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ListChecks size={16} /> Чек-лист
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <MessageSquare size={16} /> Чат
                    </button>
                </div>

                {/* Кнопка показа комментариев (только для рекрутера) */}
                {user?.role === 'Recruiter' && activeTab === 'checklist' && (
                    <div className="px-4 py-2 border-b border-slate-50 flex-shrink-0 flex justify-end">
                        <button
                            onClick={handleToggleComments}
                            className={`p-2 rounded-lg transition-colors ${showComments ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                            title={showComments ? 'Скрыть комментарии от кандидата' : 'Показать комментарии кандидату'}
                        >
                            {showComments ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    </div>
                )}

                {/* Контент вкладок */}
                <div className="flex-grow overflow-hidden flex flex-col">
                    {activeTab === 'checklist' ? (
                        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                            {checklist.map((stage, index) => {
                                const stageId = stage.ProgressId || stage.id || stage.id;
                                const stageName = stage.CheckListTemplate?.name || stage.CheckListTemplate?.stage_name || stage.stage_name || `Этап ${index + 1}`;
                                return (
                                    <div key={stageId || index} className={`p-4 rounded-2xl border-2 transition-all ${stage.is_completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-transparent shadow-sm'}`}>
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                                            if (currentUserRole !== 'Recruiter' || !stageId) return;
                                            const newStatus = !stage.is_completed;
                                            api.patch(`/interviews/progress/${stageId}`, { is_completed: newStatus }).then(() => {
                                                setChecklist(prev => prev.map(item =>
                                                    (item.ProgressId === stageId || item.id === stageId) ? { ...item, is_completed: newStatus } : item
                                                ));
                                                socket.emit('checklist-update', { interviewId: id });
                                            });
                                        }}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${stage.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</div>
                                                <span className="font-bold text-[11px] text-slate-700 uppercase tracking-tight">{stageName}</span>
                                            </div>
                                            {stage.is_completed && <CheckCircle2 className="text-emerald-500" size={18} />}
                                        </div>
                                        {(currentUserRole === 'Recruiter' || showComments) && (
                                            <div className="mt-3">
                                                {currentUserRole === 'Recruiter' ? (
                                                    <textarea className="w-full p-2 bg-slate-50 rounded-xl text-[11px] border-none focus:ring-1 focus:ring-blue-500/50 resize-none italic" placeholder="Заметка рекрутера..." defaultValue={stage.comment} onBlur={(e) => {
                                                        const newComment = e.target.value;
                                                        api.patch(`/interviews/progress/${stageId}`, { comment: newComment }).then(() => {
                                                            if (showComments) socket.emit('checklist-update', { interviewId: id });
                                                        });
                                                    }} />
                                                ) : (stage.comment && <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[10px] text-blue-700 italic">{stage.comment}</div>)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ЧАТ */
                        <div className="flex-grow flex flex-col bg-slate-50/30">
                            {chatId ? (
                                <>
                                    {/* Сообщения */}
                                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                        {messages.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                                                <p>Начните переписку</p>
                                            </div>
                                        ) : (
                                            messages.map((msg, idx) => {
                                                const isMe = msg.sender_id === currentUserId;
                                                const isSystem = msg.is_system;
                                                if (isSystem) {
                                                    return (
                                                        <div key={msg.MessageId || idx} className="flex justify-center">
                                                            <div className="bg-white border border-blue-100 px-4 py-2 rounded-2xl text-xs text-blue-600 shadow-sm">
                                                                {msg.message_text}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={msg.MessageId || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'} shadow-sm`}>
                                                            {msg.message_text}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={chatScrollRef} />
                                    </div>

                                    {/* Инпут */}
                                    <div className="p-3 border-t border-slate-100 bg-white flex gap-2 flex-shrink-0">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                            placeholder="Сообщение..."
                                            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            maxLength={5000}
                                        />
                                        <button
                                            onClick={sendChatMessage}
                                            disabled={!chatInput.trim()}
                                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-slate-400 text-sm p-8 text-center">
                                    <div>
                                        <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-semibold text-slate-500">Чат ещё не создан</p>
                                        <p className="text-xs mt-1 mb-4">Чат создаётся при начале рассмотрения кандидата</p>
                                        {currentUserRole === 'Recruiter' ? (
                                            <button
                                                onClick={handleCreateChat}
                                                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                                            >
                                                Создать чат
                                            </button>
                                        ) : (
                                            <p className="text-xs text-slate-300">Ожидайте, пока рекрутер создаст чат</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default InterviewPage;