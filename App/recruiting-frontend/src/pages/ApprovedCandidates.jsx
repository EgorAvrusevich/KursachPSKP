import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
// Добавил недостающие иконки
import { 
    User, Phone, FileText, Calendar, Trash2, Search, 
    X, Video, Loader2, ShieldCheck 
} from 'lucide-react';
import Button from '../components/ui/Button';
import {Card} from '../components/ui/Card'; // Убедитесь, что путь верный
import ChatWindow from '../components/ChatWindow'; 

const ApprovedCandidates = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Состояния модалки
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState("");
    
    // Состояния для функций внутри модалки
    const [interviewMode, setInterviewMode] = useState('now');
    const [interviewDate, setInterviewDate] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        fetchApproved();
    }, []);

    // Синхронизация заметки при выборе кандидата
    useEffect(() => {
        if (selectedCandidate) {
            setNoteText(selectedCandidate.notes || "");
        }
    }, [selectedCandidate]);

    const fetchApproved = async () => {
        try {
            const res = await api.get('/approved/');
            setCandidates(res.data);
        } catch (err) {
            console.error("Ошибка при загрузке", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNote = async () => {
        if (noteText.length > 1000) {
            alert("Заметка слишком длинная (макс. 1000 символов)");
            return;
        }
        try {
            await api.patch(`/approved/${selectedCandidate.Id}/`, {
                notes: noteText
            });
            setSelectedCandidate(prev => ({ ...prev, notes: noteText }));
            setCandidates(prev => prev.map(c => c.Id === selectedCandidate.Id ? { ...c, notes: noteText } : c));
            setIsEditingNote(false);
        } catch (err) {
            alert("Не удалось сохранить заметку");
        }
    };

    const removeCandidate = async (id) => {
        if (!window.confirm("Удалить из списка одобренных?")) return;
        try {
            await api.delete(`/approved/${id}`);
            setCandidates(prev => prev.filter(c => c.Id !== id));
        } catch (err) {
            alert("Ошибка удаления");
        }
    };

    // Заглушки для функций (реализуйте по логике вашего API)
    const handleApproveCandidate = () => console.log("Approve logic");
    const handleScheduleInterview = () => console.log("Interview logic");

    const filteredCandidates = candidates.filter(c =>
        c.CandidateProfile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-slate-500">Загрузка списка...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Одобренные кандидаты</h1>
                    <p className="text-slate-500">Ваш персональный шорт-лист талантов</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Поиск по имени..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            {filteredCandidates.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
                    <User className="text-slate-300 mx-auto mb-4" size={32} />
                    <p className="text-slate-500">Никого не найдено</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCandidates.map((item) => (
                        <div 
                            key={item.Id} 
                            onClick={() => setSelectedCandidate(item)}
                            className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <User size={24} />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Чтобы не открывалась модалка
                                        removeCandidate(item.Id);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h3 className="font-bold text-lg text-slate-800 mb-1">
                                {item.CandidateProfile?.full_name || "Имя не указано"}
                            </h3>

                            <div className="space-y-2 mb-4 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    {item.CandidateProfile?.phone || "Нет телефона"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    Добавлен {new Date(item.added_at).toLocaleDateString()}
                                </div>
                            </div>

                            {item.notes && (
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-700 italic line-clamp-2">"{item.notes}"</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ВЫНЕСЕННАЯ МОДАЛКА (ОДНА НА ВЕСЬ КОМПОНЕНТ) */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 shadow-2xl border-none overflow-hidden animate-in zoom-in duration-200 bg-white">
                        {/* Хедер модалки */}
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div className="flex gap-6 ml-2">
                                {['profile'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-2 text-sm font-bold capitalize transition-colors ${
                                            activeTab === tab 
                                            ? 'border-b-2 border-blue-600 text-blue-600' 
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {tab === 'profile' ? 'Профиль' : tab === 'interview' ? 'Интервью' : 'Чат'}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedCandidate(null);
                                    setIsEditingNote(false);
                                }} 
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Контент модалки */}
                        <div className="flex-1 overflow-y-auto min-h-[450px] bg-slate-50">
                            {activeTab === 'profile' && (
                                <div className="p-8 space-y-6 bg-white h-full">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold">
                                            {selectedCandidate.CandidateProfile?.full_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h1 className="text-2xl font-black text-slate-900">
                                                {selectedCandidate.CandidateProfile?.full_name}
                                            </h1>
                                            <p className="text-blue-600 font-semibold">Одобренный кандидат</p>
                                        </div>
                                    </div>

                                    {/* СЕКЦИЯ ЗАМЕТКИ */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black">
                                            <span>Заметка рекрутера</span>
                                            {!isEditingNote && (
                                                <button onClick={() => setIsEditingNote(true)} className="text-blue-600 hover:underline">Изменить</button>
                                            )}
                                        </div>
                                        {isEditingNote ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    className="w-full p-4 bg-slate-50 border border-blue-200 rounded-2xl outline-none text-sm min-h-[100px]"
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingNote(false)}>Отмена</Button>
                                                    <Button size="sm" onClick={handleUpdateNote}>Сохранить</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => setIsEditingNote(true)} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-slate-600 text-sm italic cursor-pointer">
                                                {selectedCandidate.notes || "Нажмите, чтобы добавить заметку..."}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 bg-slate-50 rounded-2xl">
                                         <p className="text-[10px] text-slate-400 uppercase font-black mb-2">Опыт / Биография</p>
                                         <p className="text-slate-600 leading-relaxed text-sm">
                                             {selectedCandidate.CandidateProfile?.bio || "Биография не указана."}
                                         </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ApprovedCandidates;