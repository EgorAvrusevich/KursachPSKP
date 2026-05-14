import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import api from '../api';
import { Card } from '../components/ui/Card';
import {
    PhoneOff, Mic, MicOff, Video, VideoOff,
    CheckCircle2, Loader2, Eye, EyeOff, User, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InterviewPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    // Состояния данных
    const [interviewData, setInterviewData] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);

    // Локальные настройки (не должны перезапускать WebRTC)
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [showComments, setShowComments] = useState(false);

    // Статус собеседника
    const [remoteStatus, setRemoteStatus] = useState({
        isMicOn: true,
        isVideoOn: true,
        role: null,
        joined: false
    });

    // Refs для управления соединением без ререндеров
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const pc = useRef(null);
    const localStreamRef = useRef(null);
    const isNegotiating = useRef(false); // защита от двойного offer

    const VideoPlaceholder = () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 z-10">
            <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-600 shadow-xl">
                <User size={48} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                Камера выключена
            </p>
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
            // ВАЖНО: используйте функциональное обновление стейта, 
            // чтобы избежать зависимостей от самого checklist
            setChecklist(res.data?.Application?.CandidateProgresses || []);
            setShowComments(res.data.show_comments_to_candidate);
        } catch (err) {
            console.error("Ошибка обновления чек-листа:", err);
        }
    }, [id]);

    const fetchChecklistRef = useRef(fetchChecklist);

    // Синхронизируем Ref
    useEffect(() => {
        fetchChecklistRef.current = fetchChecklist;
    }, [fetchChecklist]);

    // 1. Загрузка данных интервью
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/interviews/${id}`);
                const data = res.data;
                setInterviewData(data);

                // ИСПРАВЛЕННЫЙ ПУТЬ: данные лежат в data.Application.CandidateProgresses
                const progressStages = data?.Application?.CandidateProgresses;
                const templateStages = data?.Application?.Vacancy?.CheckListTemplates;

                const stages = progressStages && progressStages.length > 0
                    ? progressStages
                    : templateStages || [];

                setChecklist(stages);
                setShowComments(data.show_comments_to_candidate);
                setLoading(false);
            } catch (err) {
                console.error("Ошибка загрузки:", err);
                if (err.response?.status === 401) navigate('/login');
            }
        };
        fetchData();
    }, [id, navigate]);

    // 2. Инициализация WebRTC и Socket (только ОДИН раз при входе)
    useEffect(() => {
        if (!user || !currentUserId || !id) return;

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.current = peerConnection;

        // Обработка ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('new-ice-candidate', { interviewId: id, candidate: event.candidate });
            }
        };

        // Получение удаленного трека
        peerConnection.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Настройка медиа
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
            })
            .catch(err => console.error("Ошибка доступа к камере/микрофону:", err));

        // Socket Listeners
        socket.on('user-joined', async (data) => {
            setRemoteStatus(prev => ({ ...prev, role: data.role, joined: true }));

            // Сообщаем вошедшему наши текущие настройки
            socket.emit('share-status', {
                interviewId: id,
                status: { isMicOn: true, isVideoOn: true, role: user.role }
            });

            // Кто пришёл вторым — тот создаёт offer (не зависит от роли)
            // Используем "perfect negotiation" паттерн:
            // - Если мы уже отправили offer (isNegotiating = true) — игнорируем
            // - Если нет — создаём offer и помечаем что мы инициатор
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
            // Если мы сами уже отправили offer — игнорируем входящий (collision)
            // Тот кто НЕ инициировал — отвечает answer
            if (isNegotiating.current) {
                console.log("Пропущен входящий offer — мы уже инициатор");
                return;
            }
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
            // Обрабатываем answer только если мы были инициатором
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
            console.log("Получено обновление чек-листа");
            // Вызываем именно текущее значение из Ref
            if (fetchChecklistRef.current) {
                fetchChecklistRef.current();
            }
        });

        return () => {
            socket.off('user-joined');
            socket.off('status-update');
            socket.off('video-offer');
            socket.off('video-answer');
            socket.off('settings-update');
            socket.off('checklist-update');
            socket.off('new-ice-candidate');
            socket.disconnect();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            peerConnection.close();
        };
    }, [id, user?.role]); // Зависим только от ID и Роли, настройки внутри не важны

    // 3. Функции управления (без перезагрузки эффекта)
    const toggleMic = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            const newStatus = !audioTrack.enabled;
            audioTrack.enabled = newStatus;
            setIsMicOn(newStatus);
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn: newStatus, isVideoOn }
            });
        }
    };

    const toggleVideo = () => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            const newStatus = !videoTrack.enabled;
            videoTrack.enabled = newStatus;
            setIsVideoOn(newStatus);
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn, isVideoOn: newStatus }
            });
        }
    };

    const handleToggleComments = async () => {
        if (user?.role !== 'Recruiter') return;

        const newValue = !showComments;
        try {
            // ИСПОЛЬЗУЕМ PATCH вместо GET, так как мы ОБНОВЛЯЕМ данные
            // И передаем объект с данными вторым аргументом
            await api.patch(`/interviews/${id}/settings`, {
                show_comments_to_candidate: newValue
            });

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

            {/* ЧЕК-ЛИСТ */}
            <Card className="w-96 flex-shrink-0 flex flex-col shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
                <div className="p-8 border-b border-slate-100 flex-shrink-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Чек-лист</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Интервью в процессе</p>
                        </div>
                    </div>
                    {user?.role === 'Recruiter' && (
                        <button
                            onClick={async () => {
                                const newValue = !showComments;
                                await api.patch(`/interviews/${id}/settings`, { show_comments_to_candidate: newValue }); // Проверь метод (PATCH/PUT)
                                setShowComments(newValue);
                                // Оповещаем кандидата и о смене настроек, и о необходимости обновить данные
                                socket.emit('settings-update', { interviewId: id, showComments: newValue });
                                socket.emit('checklist-update', { interviewId: id });
                            }}
                            className={`p-2 rounded-lg transition-colors ${showComments ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                            {showComments ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {checklist.map((stage, index) => {
                        console.log(stage);
                        const stageId = stage.ProgressId || stage.id || stage.id;
                        const stageName = stage.CheckListTemplate?.name || stage.CheckListTemplate?.stage_name || stage.stage_name || `Этап ${index + 1}`;
                        return (
                            <div key={stageId || index} className={`p-4 rounded-2xl border-2 transition-all ${stage.is_completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-transparent shadow-sm'}`}>
                                <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                                    if (currentUserRole !== 'Recruiter' || !stageId) return;
                                    const newStatus = !stage.is_completed;

                                    api.patch(`/interviews/progress/${stageId}`, { is_completed: newStatus }).then(() => {
                                        // 1. Обновляем у себя локально
                                        setChecklist(prev => prev.map(item =>
                                            (item.ProgressId === stageId || item.id === stageId) ? { ...item, is_completed: newStatus } : item
                                        ));

                                        // 2. ОПОВЕЩАЕМ КАНДИДАТА (Важно!)
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
                                                    if (showComments) {
                                                        socket.emit('checklist-update', { interviewId: id });
                                                    }
                                                });
                                            }} />
                                        ) : (stage.comment && <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[10px] text-blue-700 italic">{stage.comment}</div>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card >
        </div >
    );
};

export default InterviewPage;