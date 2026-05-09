import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChatWindow from '../components/ChatWindow';
import {
    User, Mail, Phone, CheckCircle, XCircle,
    Clock, Loader2, ArrowLeft, X, MessageSquare, Calendar, Video, ListChecks, CheckCircle2
} from 'lucide-react';



const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
};

const ManageVacancy = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [interviewDate, setInterviewDate] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [interviewMode, setInterviewMode] = useState('now');

    // Состояния для чек-листа
    const [checklist, setChecklist] = useState([]);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    const token = localStorage.getItem('token');
    const currentUserId = token ? parseJwt(token)?.id : null;
    const [editingComment, setEditingComment] = useState({ itemId: null, text: '' });

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

    // Загрузка чек-листа при переключении на вкладку
    useEffect(() => {
        if (activeTab === 'checklist' && selectedCandidate) {
            const fetchChecklist = async () => {
                setLoadingChecklist(true);
                try {
                    const appId = selectedCandidate.ApplicationId;
                    const res = await api.get(`/applications/${appId}/checklist`);
                    setChecklist(res.data);
                } catch (err) {
                    console.error("Ошибка загрузки чек-листа", err);
                } finally {
                    setLoadingChecklist(false);
                }
            };
            fetchChecklist();
        }
    }, [activeTab, selectedCandidate]);

    const updateStatus = async (appId, newStatus) => {
        try {
            await api.patch(`/applications/${appId}/status`, { status: newStatus });
            setCandidates(prev => prev.map(c =>
                c.ApplicationId === appId ? { ...c, status: newStatus } : c
            ));
            if (selectedCandidate?.ApplicationId === appId) {
                setSelectedCandidate(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            alert("Не удалось обновить статус");
        }
    };

    // Функция переключения задачи чек-листа
    const toggleChecklistItem = async (itemId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await api.patch(`/progress/${itemId}`, { is_completed: newStatus });
            setChecklist(prev => prev.map(item =>
                item.id === itemId ? { ...item, is_completed: newStatus } : item
            ));
        } catch (err) {
            alert("Ошибка при обновлении задачи");
        }
    };

    // Функция для сохранения комментария
    const saveComment = async (itemId) => {
        try {
            await api.patch(`/progress/${itemId}`, { comment: editingComment.text });
            setChecklist(prev => prev.map(item =>
                item.id === itemId ? { ...item, comment: editingComment.text } : item
            ));
            setEditingComment({ itemId: null, text: '' });
        } catch (err) {
            alert("Ошибка при сохранении комментария");
        }
    };

    const handleScheduleInterview = async () => {
        let scheduledAt;
        if (interviewMode === 'now') {
            scheduledAt = new Date();
            const timezoneOffset = scheduledAt.getTimezoneOffset() * 60000;
            scheduledAt = new Date(scheduledAt.getTime() - timezoneOffset).toISOString();
        } else {
            if (!interviewDate) return alert("Выберите дату и время");
            const localDate = new Date(interviewDate);
            const timezoneOffset = localDate.getTimezoneOffset() * 60000;
            scheduledAt = new Date(localDate.getTime() - timezoneOffset).toISOString();
        }

        setScheduling(true);
        try {
            const res = await api.post('/interviews/schedule', {
                application_id: selectedCandidate.ApplicationId,
                scheduled_at: scheduledAt,
            });

            if (interviewMode === 'now') {
                if (res.data.interviewId) navigate(`/interview/${res.data.interviewId}`);
            } else {
                alert("Интервью успешно запланировано!");
                setInterviewDate('');
            }
        } catch (error) {
            alert("Ошибка: " + (error.response?.data?.message || error.message));
        } finally {
            setScheduling(false);
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
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/vacancies/my-vacancies')} className="rounded-full w-10 h-10 p-0">
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-3xl font-black text-slate-800">Управление кандидатами</h1>
            </div>

            <div className="grid gap-4">
                {candidates.length > 0 ? (
                    candidates.map(app => (
                        <Card key={app.ApplicationId} className="p-5 border-l-4 border-l-blue-600 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4 flex-1 cursor-pointer group" onClick={() => { setSelectedCandidate(app); setActiveTab('profile'); }}>
                                    <div className="shrink-0 w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100 transition-colors">
                                        {app.Candidate?.Profile?.full_name?.charAt(0) || 'К'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                            {app.Candidate?.Profile?.full_name || 'Анонимный кандидат'}
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1.5"><Mail size={13} /> {app.Candidate?.email}</span>
                                            <span className="flex items-center gap-1.5"><Phone size={13} /> {app.Candidate?.Profile?.phone || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Новая кнопка: Рассмотрение */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={app.status === 'Рассмотрение'}
                                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                        onClick={(e) => { e.stopPropagation(); updateStatus(app.ApplicationId, 'Рассмотрение'); }}
                                    >
                                        <Clock size={16} className="mr-1" /> Рассмотреть
                                    </Button>

                                    <Button variant="outline" size="sm" disabled={app.status === 'Принято'} className="text-emerald-600 border-emerald-200" onClick={(e) => { e.stopPropagation(); updateStatus(app.ApplicationId, 'Принято'); }}>
                                        <CheckCircle size={16} className="mr-1" /> Принять
                                    </Button>

                                    <Button variant="outline" size="sm" disabled={app.status === 'Отказ'} className="text-red-600 border-red-200" onClick={(e) => { e.stopPropagation(); updateStatus(app.ApplicationId, 'Отказ'); }}>
                                        <XCircle size={16} className="mr-1" /> Отказать
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">На эту вакансию пока никто не откликнулся</div>
                )}
            </div>

            {selectedCandidate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 shadow-2xl border-none overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div className="flex gap-6 ml-2">
                                {['profile', 'interview', 'checklist', 'chat'].map((tab) => {
                                    const status = selectedCandidate.status;

                                    // Разрешаем чек-лист и чат только для "Принято" и "Рассмотрение"
                                    const isRestrictedTab = tab === 'checklist' || tab === 'chat';
                                    const isAllowedStatus = status === 'Принято' || status === 'Рассмотрение';

                                    if (isRestrictedTab && !isAllowedStatus) return null;

                                    const labels = { profile: 'Профиль', interview: 'Интервью', checklist: 'Чек-лист', chat: 'Чат' };
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`pb-2 text-sm font-bold capitalize transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {labels[tab]} {tab === 'checklist' && <ListChecks size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[450px] bg-slate-50">
                            {activeTab === 'profile' && (
                                <div className="p-8 space-y-6 bg-white h-full">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold">
                                            {selectedCandidate.Candidate?.Profile?.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black text-slate-900">{selectedCandidate.Candidate?.Profile?.full_name}</h1>
                                            <p className="text-blue-600 font-semibold">Статус: {selectedCandidate.status}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 uppercase font-black">Email</p>
                                            <p className="text-slate-700 font-medium truncate">{selectedCandidate.Candidate?.email}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 uppercase font-black">Телефон</p>
                                            <p className="text-slate-700 font-medium">{selectedCandidate.Candidate?.Profile?.phone || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-slate-400 uppercase font-black">Опыт</p>
                                        <div className="p-6 bg-white border border-slate-200 rounded-2xl text-slate-600 leading-relaxed">
                                            {selectedCandidate.Candidate?.Profile?.bio || "Информация отсутствует."}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'checklist' && (
                                <div className="p-8 space-y-4 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-slate-800">Контроль этапов</h2>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                            Выполнено: {checklist.filter(i => i.is_completed).length} / {checklist.length}
                                        </span>
                                    </div>

                                    {loadingChecklist ? (
                                        <div className="py-20 text-center text-slate-400">Загрузка данных...</div>
                                    ) : checklist.length > 0 ? (
                                        <div className="space-y-4">
                                            {checklist.map((item) => (
                                                <div key={item.id} className="flex flex-col gap-2 p-5 rounded-2xl border bg-white border-slate-200 shadow-sm transition-all">
                                                    <div className="flex items-start gap-4">
                                                        <div
                                                            onClick={() => toggleChecklistItem(item.id, item.is_completed)}
                                                            className={`mt-1 p-1 rounded-full cursor-pointer transition-colors ${item.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}
                                                        >
                                                            <CheckCircle2 size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`font-bold transition-colors ${item.is_completed ? 'text-emerald-900 line-through opacity-70' : 'text-slate-700'}`}>
                                                                {item.title}
                                                            </p>
                                                            <p className="text-sm text-slate-500">{item.description}</p>
                                                        </div>
                                                    </div>

                                                    {/* Блок комментариев */}
                                                    <div className="mt-3 pt-3 border-t border-slate-50">
                                                        {editingComment.itemId === item.id ? (
                                                            <div className="space-y-2">
                                                                <textarea
                                                                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-300 transition-all"
                                                                    placeholder="Ваш комментарий по кандидату..."
                                                                    value={editingComment.text}
                                                                    onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="sm" variant="ghost" onClick={() => setEditingComment({ itemId: null, text: '' })}>Отмена</Button>
                                                                    <Button size="sm" onClick={() => saveComment(item.id)}>Сохранить</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => setEditingComment({ itemId: item.id, text: item.comment || '' })}
                                                                className="group flex items-center justify-between cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-2 text-slate-400 italic text-sm">
                                                                    <MessageSquare size={14} />
                                                                    <span>{item.comment || "Добавить комментарий для рекрутёра..."}</span>
                                                                </div>
                                                                <span className="text-[10px] opacity-0 group-hover:opacity-100 font-bold text-blue-600 uppercase transition-opacity">Изменить</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                                            Для этого кандидата еще не создано задач.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'interview' && (
                                <div className="p-8 flex flex-col items-center justify-center space-y-6 h-full bg-white">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-500 ${interviewMode === 'now' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {interviewMode === 'now' ? <Video size={40} /> : <Calendar size={40} />}
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold text-slate-800">Проведение интервью</h2>
                                    </div>
                                    <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-sm border border-slate-200">
                                        <button onClick={() => setInterviewMode('now')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${interviewMode === 'now' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>Начать сейчас</button>
                                        <button onClick={() => setInterviewMode('scheduled')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${interviewMode === 'scheduled' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>Запланировать</button>
                                    </div>
                                    <div className="w-full max-w-sm min-h-[100px] flex items-center">
                                        {interviewMode === 'scheduled' ? (
                                            <div className="w-full space-y-3">
                                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Дата и время</label>
                                                <input type="datetime-local" className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-semibold text-slate-700" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
                                            </div>
                                        ) : (
                                            <div className="w-full p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-center">
                                                <p className="text-sm text-blue-700 font-medium">Вы перейдете в звонок сразу, кандидату придет уведомление.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleScheduleInterview} disabled={scheduling} className={`w-full max-w-sm py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center ${scheduling ? 'bg-slate-400' : interviewMode === 'now' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                        {scheduling ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : interviewMode === 'now' ? 'Создать и войти' : 'Запланировать встречу'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className="h-full bg-white">
                                    <ChatWindow applicationId={selectedCandidate.ApplicationId} currentUserId={currentUserId} />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ManageVacancy;