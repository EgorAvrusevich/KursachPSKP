import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import api from '../api';
import { Card } from '../components/ui/Card';
import ChatWindow from '../components/ChatWindow';
import {
    PhoneOff, Mic, MicOff, Video, VideoOff,
    CheckCircle2, Loader2, Eye, EyeOff, User, ShieldCheck, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InterviewPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [interviewData, setInterviewData] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [activeTab, setActiveTab] = useState('checklist');
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
    const remoteCandidatesQueue = useRef([]);
    const micStatusRef = useRef(true);
    const videoStatusRef = useRef(true);

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

    const processIceQueue = useCallback(async () => {
        if (!pc.current || !pc.current.remoteDescription) return;
        while (remoteCandidatesQueue.current.length > 0) {
            const candidate = remoteCandidatesQueue.current.shift();
            try {
                await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Ошибка добавления накопленного ICE:", e);
            }
        }
    }, []);

    // Улучшенная функция создания оффера с проверками
    const createAndSendOffer = useCallback(async () => {
        if (!pc.current) return;

        // Ждем стабильного состояния, если идет пересогласование
        if (pc.current.signalingState !== 'stable') return;

        try {
            console.log("Инициализация звонка: Создание Offer...");
            const offer = await pc.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.current.setLocalDescription(offer);
            socket.emit('video-offer', { interviewId: id, offer });
        } catch (e) {
            console.error("Offer error:", e);
        }
    }, [id]);

    useEffect(() => {
        let isMounted = true;
        let localStream = null;

        if (!currentUserId || !currentUserRole || !id) return;

        const initSession = async () => {
            try {
                const res = await api.get(`/interviews/${id}`);
                if (!isMounted) return;

                setInterviewData(res.data);
                setChecklist(res.data?.Application?.CandidateProgresses || []);
                setShowComments(res.data.show_comments_to_candidate);

                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

                const peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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

                peerConnection.onconnectionstatechange = () => {
                    if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
                        setRemoteStatus(prev => ({ ...prev, joined: false }));
                    }
                };

                pc.current = peerConnection;

                // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

                socket.on('user-joined', (data) => {
                    console.log("Собеседник вошел:", data.role);
                    setRemoteStatus(prev => ({ ...prev, role: data.role, joined: true }));

                    // Если зашел Кандидат, Рекрутер отправляет Offer с небольшой задержкой,
                    // чтобы Кандидат успел навесить свои слушатели video-offer
                    if (currentUserRole === 'Recruiter') {
                        setTimeout(() => createAndSendOffer(), 1000);
                    }
                });

                // Кандидат запрашивает оффер, если зашел вторым
                socket.on('request-video-offer', () => {
                    if (currentUserRole === 'Recruiter') {
                        createAndSendOffer();
                    }
                });

                socket.on('video-offer', async (offer) => {
                    if (!pc.current) return;
                    console.log("Получен Offer, создаю Answer...");
                    await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.current.createAnswer();
                    await pc.current.setLocalDescription(answer);
                    socket.emit('video-answer', { interviewId: id, answer });
                    processIceQueue();
                });

                socket.on('video-answer', async (answer) => {
                    if (!pc.current) return;
                    console.log("Получен Answer, соединение устанавливается.");
                    await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
                    processIceQueue();
                });

                socket.on('new-ice-candidate', async (candidate) => {
                    if (pc.current?.remoteDescription) {
                        await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { });
                    } else {
                        remoteCandidatesQueue.current.push(candidate);
                    }
                });

                socket.on('status-update', (status) => setRemoteStatus(prev => ({ ...prev, ...status, joined: true })));
                socket.on('settings-update', (data) => setShowComments(data.showComments));

                // ВХОД В КОМНАТУ
                socket.emit('join-interview', {
                    interviewId: id,
                    userId: currentUserId,
                    role: currentUserRole
                });

                // Если мы Кандидат, сразу после входа "пинаем" Рекрутера прислать оффер, 
                // на случай если он уже в комнате
                if (currentUserRole === 'Candidate') {
                    socket.emit('request-video-offer', { interviewId: id });
                }

                setLoading(false);
            } catch (err) {
                console.error("Ошибка инициализации:", err);
                if (err.response?.status === 401) navigate('/login');
                setLoading(false);
            }
        };

        initSession();

        return () => {
            isMounted = false;
            if (localStream) localStream.getTracks().forEach(t => t.stop());
            if (pc.current) {
                pc.current.close();
                pc.current = null;
            }
            socket.off('user-joined');
            socket.off('request-video-offer');
            socket.off('video-offer');
            socket.off('video-answer');
            socket.off('new-ice-candidate');
            socket.off('status-update');
            socket.off('settings-update');
        };
    }, [id, currentUserId, currentUserRole, navigate, processIceQueue, createAndSendOffer]);

    // Функции toggleMic и toggleVideo остаются без изменений...
    const toggleMic = () => {
        const track = localVideoRef.current?.srcObject?.getAudioTracks()[0];
        if (track) {
            const newState = !track.enabled;
            track.enabled = newState;
            setIsMicOn(newState);
            micStatusRef.current = newState;
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn: newState, isVideoOn: videoStatusRef.current }
            });
        }
    };

    const toggleVideo = () => {
        const track = localVideoRef.current?.srcObject?.getVideoTracks()[0];
        if (track) {
            const newState = !track.enabled;
            track.enabled = newState;
            setIsVideoOn(newState);
            videoStatusRef.current = newState;
            socket.emit('update-media-status', {
                interviewId: id,
                status: { isMicOn: micStatusRef.current, isVideoOn: newState }
            });
        }
    };

    const handleEndCall = () => {
        localVideoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
        navigate(currentUserRole === 'Recruiter' ? '/my-vacancies' : '/my-applications');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="font-bold text-slate-600 uppercase tracking-widest text-xs">Подключение к сессии...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 p-4 bg-[#F8FAFC] overflow-hidden">
            <div className="flex-grow flex flex-col gap-4 min-w-0">
                <div className="relative flex-grow grid grid-cols-2 gap-4 bg-slate-950 rounded-[2.5rem] p-4 shadow-2xl border border-slate-800">
                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-video self-center">
                        {!isVideoOn && <VideoPlaceholder />}
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`} />
                        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-white text-[11px] font-bold">
                            <User size={14} className={currentUserRole === 'Recruiter' ? "text-blue-400" : ""} /> ВЫ ({currentUserRole === 'Recruiter' ? 'РЕКРУТЕР' : 'КАНДИДАТ'})
                        </div>
                    </div>

                    <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-video self-center flex items-center justify-center">
                        {!remoteStatus.joined ? (
                            <div className="text-center animate-pulse">
                                <User size={48} className="mx-auto text-slate-700 mb-2" />
                                <p className="text-slate-500 text-[10px] font-black uppercase">Ожидание участника...</p>
                            </div>
                        ) : (
                            <>
                                {!remoteStatus.isVideoOn && <VideoPlaceholder />}
                                <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${!remoteStatus.isVideoOn ? 'opacity-0' : 'opacity-100'}`} />
                                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-white text-[11px] font-bold uppercase">
                                    <ShieldCheck size={14} className="text-blue-400" /> {remoteStatus.role}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="h-20 flex-shrink-0 flex justify-center items-center gap-6 bg-white rounded-[2rem] border border-slate-200 shadow-lg">
                    <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all ${isMicOn ? 'bg-slate-100' : 'bg-red-500 text-white'}`}>
                        {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>
                    <button onClick={handleEndCall} className="px-10 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
                        Завершить
                    </button>
                    <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all ${isVideoOn ? 'bg-slate-100' : 'bg-red-500 text-white'}`}>
                        {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>
                </div>
            </div>

            <Card className="w-96 flex-shrink-0 flex flex-col shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
                <div className="flex p-2 bg-slate-100/50 m-4 rounded-2xl">
                    <button onClick={() => setActiveTab('checklist')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'checklist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                        <CheckCircle2 size={14} /> Чек-лист
                    </button>
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                        <MessageSquare size={14} /> Чат
                    </button>
                </div>

                {/* Заменяем весь блок рендеринга вкладок */}
                <div className="flex-grow overflow-hidden flex flex-col">

                    {/* Контейнер ЧЕК-ЛИСТА */}
                    <div className={`flex flex-col flex-grow overflow-hidden ${activeTab !== 'checklist' ? 'hidden' : ''}`}>
                        <div className="px-8 pb-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 uppercase">Этапы</h2>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Оценка компетенций</p>
                            </div>
                            {currentUserRole === 'Recruiter' && (
                                <button
                                    onClick={async () => {
                                        const newValue = !showComments;
                                        await api.patch(`/interviews/${id}/settings`, { show_comments_to_candidate: newValue });
                                        setShowComments(newValue);
                                        socket.emit('settings-update', { interviewId: id, showComments: newValue });
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${showComments ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {showComments ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            )}
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                            {checklist.map((stage, index) => (
                                <div key={stage.ProgressId || index} /* ... твой существующий код этапов ... */ >
                                    {/* Содержимое этапа */}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Контейнер ЧАТА */}
                    <div className={`flex-grow flex flex-col overflow-hidden ${activeTab !== 'chat' ? 'hidden' : ''}`}>
                        {/* ChatWindow теперь монтируется ОДИН РАЗ при загрузке страницы */}
                        {interviewData ? (
                            <ChatWindow
                                applicationId={interviewData?.application_id || interviewData?.Application?.id || id}
                                currentUserId={currentUserId}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="animate-spin text-slate-300" />
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

const VideoPlaceholder = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10">
        <User size={40} className="text-slate-600 mb-2" />
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Камера отключена</p>
    </div>
);

export default InterviewPage;