import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Добавь импорт

const InterviewPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [interviewData, setInterviewData] = useState(null);
    const [checklist, setChecklist] = useState([]); // Инициализация массивом
    const [loading, setLoading] = useState(true); // Состояние загрузки
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const pc = useRef(new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }));

    // 1. Загрузка данных
    useEffect(() => {
        if (!user) return;

        // 1. Инициализация (создаем соединение заново при каждом входе в комнату)
        pc.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        const fetchData = async () => {
            try {
                const res = await api.get(`/interviews/${id}`);
                setInterviewData(res.data);
                setChecklist(res.data?.Application?.Vacancy?.CheckListTemplates || []);
            } catch (err) {
                console.error("Ошибка загрузки данных", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // 2. Настройка WebRTC и сокетов
        socket.connect();
        socket.emit('join-interview', { interviewId: id, userId: user.id, role: user.role });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                // Проверяем, не закрыто ли соединение, прежде чем добавлять треки
                if (pc.current.signalingState !== 'closed') {
                    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
                }
            })
            .catch(err => console.error("Ошибка камеры:", err));

        pc.current.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Слушатели сокетов
        socket.on('user-joined', async () => {
            if (user.role === 'Recruiter' && pc.current.signalingState !== 'closed') {
                const offer = await pc.current.createOffer();
                await pc.current.setLocalDescription(offer);
                socket.emit('video-offer', { interviewId: id, offer });
            }
        });

        socket.on('video-offer', async (offer) => {
            if (pc.current.signalingState !== 'closed') {
                await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                socket.emit('video-answer', { interviewId: id, answer });
            }
        });

        socket.on('video-answer', async (answer) => {
            if (pc.current.signalingState !== 'closed') {
                await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('new-ice-candidate', async (candidate) => {
            if (pc.current.signalingState !== 'closed') {
                await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // 3. CLEANUP (срабатывает при выходе со страницы)
        return () => {
            socket.off('user-joined');
            socket.off('video-offer');
            socket.off('video-answer');
            socket.off('new-ice-candidate');
            socket.disconnect();

            if (pc.current) {
                pc.current.close();
            }
            if (localVideoRef.current?.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [id, user]);

    const toggleMic = () => {
        const audioTrack = localVideoRef.current?.srcObject?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicOn(audioTrack.enabled);
        }
    };

    // Переключение камеры
    const toggleVideo = () => {
        const videoTrack = localVideoRef.current?.srcObject?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOn(videoTrack.enabled);
        }
    };

    // Полная остановка потоков при выходе
    const handleEndCall = () => {
        const stream = localVideoRef.current?.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop()); // Останавливаем камеру и микро (лампочка погаснет)
        }
        socket.emit('leave-interview', id); // Уведомляем сервер
        navigate('/my-vacancies'); // Уходим со страницы
    };

    const handleStageToggle = async (templateId, isCompleted) => {
        if (!templateId) {
            console.error("ID этапа не определен!");
            return;
        }
        try {
            await api.patch(`/progress/${templateId}`, { is_completed: isCompleted });

            setChecklist(prev => prev.map(item =>
                // Проверяем и TemplateId, и id на всякий случай
                (item.TemplateId === templateId || item.id === templateId)
                    ? { ...item, is_completed: isCompleted }
                    : item
            ));
        } catch (err) {
            console.error("Не удалось обновить прогресс", err);
        }
    };

    // ЗАЩИТА: Если данные еще грузятся, показываем спиннер
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-slate-500">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
                <p className="font-medium">Подключение к комнате интервью...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 p-4 animate-in fade-in duration-500">
            {/* Левая панель: Видео */}
            <div className="flex-grow flex flex-col gap-4">
                <div className="relative flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 rounded-3xl p-4 overflow-hidden shadow-2xl">
                    {/* Локальное видео */}
                    <div className="relative bg-slate-900 ...">
                        <video ref={localVideoRef} autoPlay muted playsInline className="..." />
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs">
                            {user?.role === 'Recruiter' ? 'Вы (Рекрутер)' : 'Вы (Кандидат)'}
                        </div>
                    </div>

                    {/* Дистанционное видео */}
                    <div className="relative bg-slate-900 ...">
                        <video ref={remoteVideoRef} autoPlay playsInline className="..." />
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs">
                            {user?.role === 'Recruiter' ? 'Кандидат' : 'Интервьюер'}
                        </div>
                    </div>
                </div>

                {/* Панель управления */}
                <div className="flex justify-center items-center gap-6 bg-white py-4 px-8 rounded-3xl shadow-sm border border-slate-100">

                    {/* Кнопка микрофона */}
                    <button
                        onClick={toggleMic}
                        className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-slate-100 text-slate-600' : 'bg-red-500 text-white'}`}
                    >
                        {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>

                    {/* Кнопка завершения */}
                    <button
                        onClick={handleEndCall}
                        className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-100"
                    >
                        <PhoneOff size={18} /> Завершить
                    </button>

                    {/* Кнопка камеры */}
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-colors ${isVideoOn ? 'bg-slate-100 text-slate-600' : 'bg-red-500 text-white'}`}
                    >
                        {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>

                </div>
            </div>

            {/* Правая панель: Чек-лист */}
            <Card className="w-96 flex flex-col shadow-xl border-slate-100 bg-slate-50/30">
                <div className="p-6 border-b bg-white rounded-t-3xl">
                    <h2 className="text-xl font-black text-slate-800">Чек-лист этапов</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                        {interviewData?.Application?.Vacancy?.title || 'Вакансия'}
                    </p>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    {checklist && checklist.length > 0 ? (
                        checklist.map((stage, index) => (
                            <div
                                key={stage.id || index}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${stage.is_completed ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                                onClick={() => handleStageToggle(stage.id, !stage.is_completed)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${stage.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                        <span className={`font-bold text-sm ${stage.is_completed ? 'text-emerald-900' : 'text-slate-700'}`}>
                                            {stage.stage_name}
                                        </span>
                                    </div>
                                    {stage.is_completed && <CheckCircle2 className="text-emerald-500" size={18} />}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            Этапы для этой вакансии не настроены
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white rounded-b-3xl border-t">
                    <Button className="w-full py-4 bg-blue-600 hover:bg-blue-700">
                        Сформировать отчет
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default InterviewPage;