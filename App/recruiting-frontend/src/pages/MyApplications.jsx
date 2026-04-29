import React, { useState, useEffect } from 'react';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChatWindow from '../components/ChatWindow'; // Импорт нашего чата
import {
    Briefcase, Calendar, Clock, MessageSquare, ChevronRight,
    X, CheckCircle2, Timer, AlertCircle, ListChecks
} from 'lucide-react';

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [activeTab, setActiveTab] = useState('details');

    // Новые стейты для чек-листа
    const [checklist, setChecklist] = useState([]);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    // Получаем ID текущего пользователя из системы (кандидата)
    const token = localStorage.getItem('token');
    const userData = token ? parseJwt(token) : null;
    const currentUserId = userData?.id;

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await api.get('/applications/my');
                setApplications(res.data);
            } catch (err) {
                console.error("Ошибка загрузки откликов", err);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, []);

    useEffect(() => {
        if (activeTab === 'checklist' && selectedApp) {
            const fetchChecklist = async () => {
                setLoadingChecklist(true);
                try {
                    const appId = selectedApp.ApplicationId || selectedApp.id;
                    const res = await api.get(`/applications/${appId}/checklist`);
                    setChecklist(res.data); // Ожидаем массив [{id, title, description, is_completed}]
                } catch (err) {
                    console.error("Ошибка загрузки чек-листа", err);
                } finally {
                    setLoadingChecklist(false);
                }
            };
            fetchChecklist();
        }
    }, [activeTab, selectedApp]);

    const isAccepted = selectedApp?.status?.trim() === 'Принято';

    // Вспомогательная функция для стилей статуса
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Принято': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Отказ': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500">Загрузка ваших откликов...</div>;

    if (applications.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h1 className="text-3xl font-black text-slate-800 mb-4">Мои отклики</h1>
                <div className="p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                    Вы еще никуда не откликнулись. Самое время найти работу!
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-black text-slate-800">Мои отклики</h1>

            <div className="grid gap-4 relative z-0">
                {applications.map(app => {
                    const cleanStatus = app.status ? app.status.trim() : '';
                    const appId = app.ApplicationId || app.id;

                    return (
                        <div
                            key={appId}
                            className="relative z-10 cursor-pointer group"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("!!! КЛИК ВЫПОЛНЕН !!!", app);
                                setSelectedApp(app);
                                setActiveTab('details');
                            }}
                        >
                            {/* Используем обычный div, если Card капризничает */}
                            <div className="p-5 bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-500 shadow-sm group-hover:shadow-md transition-all">
                                <div className="flex justify-between items-center pointer-events-none">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                            <Briefcase size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                {app.Vacancy?.title || "Без названия"}
                                            </h3>
                                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                                <Calendar size={14} /> Отклик от {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '---'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(cleanStatus)}`}>
                                            {cleanStatus}
                                        </span>
                                        {cleanStatus === 'Принято' && (
                                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center animate-pulse">
                                                <MessageSquare size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* МОДАЛКА ДЕТАЛЕЙ И ЧАТА */}
            {selectedApp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 shadow-2xl border-none overflow-hidden">

                        {/* Tabs Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div className="flex gap-6 ml-2">
                                <button onClick={() => setActiveTab('details')} className={`pb-2 text-sm font-bold ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>
                                    Детали
                                </button>

                                {/* Чек-лист виден ТОЛЬКО если принято */}
                                {isAccepted && (
                                    <button onClick={() => setActiveTab('checklist')} className={`pb-2 text-sm font-bold flex items-center gap-2 ${activeTab === 'checklist' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>
                                        Чек-лист <ListChecks size={16} />
                                    </button>
                                )}

                                <button onClick={() => setActiveTab('chat')} className={`pb-2 text-sm font-bold flex items-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>
                                    Чат {isAccepted && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                </button>
                            </div>
                            <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            {activeTab === 'details' && (
                                <div className="p-8 space-y-6">
                                    <h2 className="text-2xl font-black text-slate-900">{selectedApp.Vacancy?.title}</h2>
                                    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Описание вакансии</p>
                                        <div className="text-slate-600 leading-relaxed">{selectedApp.Vacancy?.description}</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'checklist' && (
                                <div className="p-8 space-y-4">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6">Этапы подготовки</h2>

                                    {loadingChecklist ? (
                                        <div className="py-10 text-center text-slate-400">Загрузка этапов...</div>
                                    ) : checklist.length > 0 ? (
                                        <div className="space-y-4">
                                            {checklist.map((item) => (
                                                <div key={item.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${item.is_completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                                                    <div className={`mt-1 p-1 rounded-full ${item.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold ${item.is_completed ? 'text-emerald-900' : 'text-slate-700'}`}>{item.title}</p>
                                                        <p className="text-sm text-slate-500">{item.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                                            Список задач пока пуст. Ожидайте действий от рекрутера.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className="p-4 h-full min-h-[450px]">
                                    {isAccepted ? (
                                        <ChatWindow applicationId={selectedApp.ApplicationId || selectedApp.id} currentUserId={currentUserId} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-10">
                                            <Timer size={48} className="text-amber-500 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800">Чат недоступен</h3>
                                            <p className="text-slate-500">Дождитесь одобрения вашей кандидатуры.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white border-t flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedApp(null)}>Закрыть</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MyApplications;