import React, { useEffect, useRef, useState } from 'react';
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

    const [interviewData, setInterviewData] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Вспомогательный компонент для заглушки камеры
    const VideoPlaceholder = ({ role }) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 z-10">
            <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-600 shadow-xl">
                <User size={48} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                Камера выключена
            </p>
        </div>
    );

    const getUserIdFromToken = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload).id;
        } catch (e) { return null; }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/interviews/${id}`);
                setInterviewData(res.data);
                const stages = res.data?.CandidateProgresses?.length > 0
                    ? res.data.CandidateProgresses
                    : res.data?.Application?.Vacancy?.CheckListTemplates || [];
                setChecklist(stages);
                setShowComments(res.data.show_comments_to_candidate);
                setLoading(false);
            } catch (err) {
                console.error("Ошибка загрузки:", err);
                if (err.response?.status === 401) navigate('/login');
            }
        };
        fetchData();
    }, [id, navigate]);

    useEffect(() => {
        const currentUserId = user?.id || user?.UserId || getUserIdFromToken(user?.token);
        if (!user || !currentUserId) return;

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
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

                socket.connect();
                socket.emit('join-interview', {
                    interviewId: id,
                    userId: currentUserId,
                    role: user.role,
                    mediaStatus: { isMicOn: true, isVideoOn: true } // Начальный статус
                });
            });

        socket.on('user-joined', async (data) => {
            setRemoteStatus(prev => ({ ...prev, role: data.role, joined: true }));
            socket.emit('share-status', {
                interviewId: id,
                status: { isMicOn, isVideoOn, role: user.role }
            });
            if (user.role === 'Recruiter') {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('video-offer', { interviewId: id, offer });
            }
        });

        socket.on('status-update', (status) => {
            setRemoteStatus(prev => ({ ...prev, ...status, joined: true }));
        });

        socket.on('video-offer', async (offer) => {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('video-answer', { interviewId: id, answer });
        });

        socket.on('settings-update', (data) => {
            setShowComments(data.showComments);
        });

        socket.on('video-answer', async (answer) => {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('new-ice-candidate', async (candidate) => {
            try {
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (e) { console.error(e); }
        });

        return () => {
            socket.off('user-joined');
            socket.off('status-update');
            socket.off('video-offer');
            socket.off('video-answer');
            socket.off('settings-update');
            socket.off('new-ice-candidate');
            socket.disconnect(); // Правильное отключение
            peerConnection.close();
        };
    }, [id, user, isMicOn, isVideoOn]);

    const toggleMic = () => {
        const track = localVideoRef.current?.srcObject?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            const newStatus = track.enabled;
            setIsMicOn(newStatus);
            // Отправляем только событие обновления, не перезапуская весь эффект
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn: newStatus, isVideoOn }
            });
        }
    };

    const toggleVideo = () => {
        const track = localVideoRef.current?.srcObject?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoOn(track.enabled);
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn, isVideoOn: track.enabled }
            });
        }
    };

    const handleEndCall = () => {
        localVideoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
        navigate(user.role === 'Recruiter' ? '/my-vacancies' : '/my-applications');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh]">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="font-medium text-slate-600">Подготовка виртуальной комнаты...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 p-4 bg-[#F8FAFC] overflow-hidden">
            {/* ЛЕВАЯ ЧАСТЬ: ВИДЕО (Занимает всё свободное место) */}
            <div className="flex-grow flex flex-col gap-4 min-w-0"> {/* min-w-0 важен для вложенных flex-элементов */}

                {/* СЕТКА ВИДЕО: фиксируем высоту, чтобы не прыгала */}
                <div className="relative flex-grow grid grid-cols-2 gap-4 bg-slate-950 rounded-[2.5rem] p-4 shadow-2xl border border-slate-800">

                    {/* МОЕ ВИДЕО */}
                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800/50 aspect-video self-center">
                        {!isVideoOn && <VideoPlaceholder />}
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`} />

                        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-white text-[11px] font-bold border border-white/10">
                            {user?.role === 'Recruiter' ? <ShieldCheck size={14} className="text-blue-400" /> : <User size={14} />}
                            ВЫ (Я)
                            {/* ДОБАВИЛ: статус микрофона на видео, чтобы всегда было видно */}
                            {!isMicOn && <MicOff size={12} className="text-red-500 ml-1" />}
                        </div>
                    </div>

                    {/* ВИДЕО СОБЕСЕДНИКА */}
                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800/50 flex items-center justify-center aspect-video self-center">
                        {!remoteStatus.joined ? (
                            <div className="text-center">
                                <div className="relative w-16 h-16 mx-auto mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                                    <User size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" />
                                </div>
                                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Ожидание...</p>
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

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ (фикс высоты) */}
                <div className="h-24 flex-shrink-0 flex justify-center items-center gap-6 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] border border-slate-200 shadow-xl">
                    <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all active:scale-90 ${isMicOn ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-500 text-white shadow-lg'}`}>
                        {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                    <button onClick={handleEndCall} className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-[1.25rem] font-black uppercase text-xs tracking-widest transition-all">
                        Выйти
                    </button>
                    <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all active:scale-90 ${isVideoOn ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-500 text-white shadow-lg'}`}>
                        {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>
                </div>
            </div>

            {/* ПРАВАЯ ЧАСТЬ: ЧЕК-ЛИСТ (Фиксированная ширина, не прыгает) */}
            <Card className="w-96 flex-shrink-0 flex flex-col shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
                {/* Заголовок */}
                <div className="p-8 border-b border-slate-100 flex-shrink-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Чек-лист</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Интервью в процессе</p>
                        </div>
                    </div>
                    {user?.role === 'Recruiter' && (
                        <button onClick={async () => {
                            const newValue = !showComments;
                            await api.patch(`/interviews/${id}/settings`, { show_comments_to_candidate: newValue });
                            setShowComments(newValue);
                            socket.emit('settings-update', { interviewId: id, showComments: newValue });
                        }} className={`p-3 rounded-2xl ${showComments ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {showComments ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    )}
                </div>

                {/* Прокручиваемый список */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/30 custom-scrollbar">
                    {checklist.map((stage, index) => {
                        // Определяем ID один раз, чтобы не путаться
                        const currentId = stage.ProgressId || stage.id;

                        return (
                            <div key={currentId || index} className={`p-5 rounded-3xl border-2 transition-all ${stage.is_completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-transparent'}`}>
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => {
                                        if (user?.role !== 'Recruiter') return;
                                        if (!currentId) return console.error("ID этапа не найден в объекте:", stage);

                                        api.patch(`/progress/${currentId}`, { is_completed: !stage.is_completed })
                                            .then(() => {
                                                setChecklist(prev => prev.map(item =>
                                                    (item.ProgressId === currentId || item.id === currentId)
                                                        ? { ...item, is_completed: !item.is_completed }
                                                        : item
                                                ));
                                            })
                                            .catch(err => console.error("Ошибка обновления:", err));
                                    }}
                                >
                                    {/* Содержимое (номер и название) */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${stage.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-bold text-sm text-slate-600">{stage.stage_name || stage.CheckListTemplate?.name}</span>
                                    </div>
                                    {stage.is_completed && <CheckCircle2 className="text-emerald-500" size={24} />}
                                </div>

                                {/* Если есть текстовое поле для комментария, добавь в него сохранение по onBlur */}
                                {user?.role === 'Recruiter' && (
                                    <textarea
                                        className="mt-3 w-full p-3 bg-slate-50 rounded-xl text-xs border-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Заметка для кандидата..."
                                        defaultValue={stage.comment}
                                        onBlur={(e) => {
                                            api.patch(`/progress/${currentId}`, { comment: e.target.value })
                                                .catch(err => console.error("Ошибка сохранения коммента:", err));
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}

export default InterviewPage;