import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChatWindow from '../components/ChatWindow'; // ИМПОРТ ЧАТА
import { 
    User, Mail, Phone, CheckCircle, XCircle, 
    Clock, Loader2, ArrowLeft, X, MessageSquare 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const ManageVacancy = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [activeTab, setActiveTab] = useState('profile'); // Состояние для переключения вкладок
    const { user } = useAuth(); // Достаем юзера из контекста

    // В реальном приложении ID рекрутера берется из AuthContext
    const token = localStorage.getItem('token'); 
    const decoded = token ? parseJwt(token) : null;

    const currentUserId = decoded?.id; 

    console.log("Ура! Нашли ID из токена:", currentUserId);

    console.log("DEBUG: User from localStorage:", user);
    console.log("DEBUG: Final currentUserId being passed:", currentUserId);

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const res = await api.get(`/vacancies/${id}/candidates`);
                setCandidates(res.data);
            } catch (err) {
                console.error("Ошибка загрузки", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidates();
    }, [id]);

    const updateStatus = async (appId, newStatus) => {
        try {
            await api.patch(`/applications/${appId}/status`, { status: newStatus });
            setCandidates(prev => prev.map(c =>
                c.ApplicationId === appId ? { ...c, status: newStatus } : c
            ));
        } catch (err) {
            alert("Не удалось обновить статус");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-slate-500 font-medium">Загрузка списка кандидатов...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 relative">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/vacancies/my-vacancies')}
                    className="rounded-full w-10 h-10 p-0"
                >
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-3xl font-black text-slate-800">Управление кандидатами</h1>
            </div>

            {/* List of Candidates */}
            <div className="grid gap-4">
                {candidates.length > 0 ? (
                    candidates.map(app => (
                        <Card key={app.ApplicationId} className="p-5 border-l-4 border-l-blue-600 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div
                                    className="flex items-center gap-4 flex-1 min-w-0 w-full cursor-pointer group"
                                    onClick={() => {
                                        setSelectedCandidate(app);
                                        setActiveTab('profile'); // Сбрасываем на профиль при открытии
                                    }}
                                >
                                    <div className="shrink-0 w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100 transition-colors">
                                        {app.Candidate?.Profile?.full_name?.charAt(0) || 'К'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                            {app.Candidate?.Profile?.full_name || 'Анонимный кандидат'}
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1.5">
                                                <Mail size={13} className="text-slate-400" /> {app.Candidate?.email}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Phone size={13} className="text-slate-400" /> {app.Candidate?.Profile?.phone || 'Нет номера'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Принять */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={app.status === 'Принято'}
                                        className={`text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-9 px-3 flex items-center gap-2 ${app.status === 'Принято' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (app.status !== 'Принято') updateStatus(app.ApplicationId, 'Принято');
                                        }}
                                    >
                                        <CheckCircle size={16} />
                                        <span className="hidden sm:inline">Принять</span>
                                    </Button>

                                    {/* Отказать */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={app.status === 'Отказ'}
                                        className={`text-red-600 border-red-200 hover:bg-red-50 h-9 px-3 flex items-center gap-2 ${app.status === 'Отказ' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (app.status !== 'Отказ') updateStatus(app.ApplicationId, 'Отказ');
                                        }}
                                    >
                                        <XCircle size={16} />
                                        <span className="hidden sm:inline">Отказать</span>
                                    </Button>

                                    {/* Интервью */}
                                    {app.status === 'Принято' && (
                                        <Button
                                            size="sm"
                                            className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-3 flex items-center gap-2"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/schedule/${app.ApplicationId}`); }}
                                        >
                                            <Clock size={16} />
                                            <span className="hidden sm:inline">Интервью</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">На эту вакансию пока никто не откликнулся</p>
                    </div>
                )}
            </div>

            {/* МОДАЛЬНОЕ ОКНО С ЧАТОМ */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 shadow-2xl border-none animate-in fade-in zoom-in duration-200 overflow-hidden">
                        
                        {/* Шапка модалки */}
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div className="flex gap-4 ml-2">
                                <button 
                                    onClick={() => setActiveTab('profile')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Профиль
                                </button>
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Чат {selectedCandidate.status === 'Принято' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                                </button>
                            </div>
                            <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Контент: Профиль */}
                        {activeTab === 'profile' && (
                            <div className="p-8 overflow-y-auto space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold">
                                        {selectedCandidate.Candidate?.Profile?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900">{selectedCandidate.Candidate?.Profile?.full_name}</h1>
                                        <p className="text-blue-600 font-semibold mt-1">Статус: {selectedCandidate.status}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Email</p>
                                        <p className="text-slate-700 font-medium flex items-center gap-2"><Mail size={16} /> {selectedCandidate.Candidate?.email}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Телефон</p>
                                        <p className="text-slate-700 font-medium flex items-center gap-2"><Phone size={16} /> {selectedCandidate.Candidate?.Profile?.phone || '—'}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Опыт и навыки</p>
                                    <div className="p-6 bg-white border border-slate-200 rounded-2xl text-slate-600 leading-relaxed">
                                        {selectedCandidate.Candidate?.Profile?.bio || "Информация отсутствует."}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Контент: Чат */}
                        {activeTab === 'chat' && (
                            <div className="p-4 bg-slate-50 flex-1 overflow-hidden min-h-[400px]">
                                {selectedCandidate.status === 'Принято' ? (
                                    <ChatWindow 
                                        applicationId={selectedCandidate.ApplicationId} 
                                        currentUserId={currentUserId} 
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-4">
                                        <div className="p-4 bg-slate-200 rounded-full text-slate-400">
                                            <MessageSquare size={40} />
                                        </div>
                                        <p className="text-slate-500 font-medium">
                                            Чат станет доступен после того, как вы нажмете кнопку <span className="text-emerald-600 font-bold">"Принять"</span> для этого кандидата.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Футер (показываем только во вкладке профиля) */}
                        {activeTab === 'profile' && (
                            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setSelectedCandidate(null)}>Закрыть</Button>
                                {selectedCandidate.status === 'Принято' && (
                                    <Button 
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => navigate(`/schedule/${selectedCandidate.ApplicationId}`)}
                                    >
                                        <Clock size={18} className="mr-2" /> Назначить интервью
                                    </Button>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ManageVacancy;