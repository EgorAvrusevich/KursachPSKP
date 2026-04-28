import React, { useState, useEffect } from 'react';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChatWindow from '../components/ChatWindow'; // Импорт нашего чата
import { 
    Briefcase, Calendar, Clock, MessageSquare, 
    X, CheckCircle2, Timer, AlertCircle 
} from 'lucide-react';

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [activeTab, setActiveTab] = useState('details');

    // Получаем ID текущего пользователя из системы (кандидата)
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.UserId;

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

    // Вспомогательная функция для стилей статуса
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Принято': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Отказ': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500">Загрузка ваших откликов...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-black text-slate-800">Мои отклики</h1>

            <div className="grid gap-4">
                {applications.map(app => (
                    <Card 
                        key={app.ApplicationId} 
                        className="p-5 cursor-pointer hover:shadow-md transition-all border-l-4 border-blue-500"
                        onClick={() => {
                            setSelectedApp(app);
                            setActiveTab('details');
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{app.Vacancy?.title}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <Calendar size={14} /> Отклик от {new Date(app.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(app.status)}`}>
                                    {app.status}
                                </span>
                                {app.status === 'Принято' && (
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center animate-pulse">
                                        <MessageSquare size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* МОДАЛКА ДЕТАЛЕЙ И ЧАТА */}
            {selectedApp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in duration-200">
                        
                        {/* Tabs Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div className="flex gap-6 ml-2">
                                <button 
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Детали вакансии
                                </button>
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`pb-2 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Чат с рекрутером
                                    {selectedApp.status === 'Принято' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                                </button>
                            </div>
                            <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            {activeTab === 'details' ? (
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black text-slate-900">{selectedApp.Vacancy?.title}</h2>
                                        <div className="flex items-center gap-4 text-slate-500 text-sm">
                                            <span className="flex items-center gap-1"><Clock size={14}/> {selectedApp.status}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Описание вакансии</p>
                                        <div className="text-slate-600 leading-relaxed">
                                            {selectedApp.Vacancy?.description}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 h-full min-h-[450px]">
                                    {selectedApp.status === 'Принято' ? (
                                        <ChatWindow 
                                            applicationId={selectedApp.ApplicationId} 
                                            currentUserId={currentUserId} 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-4">
                                            <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                                <Timer size={48} className="text-amber-500 mx-auto mb-4" />
                                                <h3 className="text-lg font-bold text-slate-800">Чат пока недоступен</h3>
                                                <p className="text-slate-500 mt-2 max-w-xs">
                                                    Рекрутер откроет чат, как только рассмотрит ваш отклик и переведет его в статус <span className="text-emerald-600 font-bold">"Принято"</span>.
                                                </p>
                                            </div>
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