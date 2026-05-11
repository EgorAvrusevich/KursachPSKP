import React, { useState, useEffect } from 'react';
import api from '../api';
import { User, Phone, FileText, Calendar, Trash2, Search } from 'lucide-react';

const ApprovedCandidates = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchApproved();
    }, []);

    const fetchApproved = async () => {
        try {
            const res = await api.get('/approved/');
            setCandidates(res.data);
        } catch (err) {
            console.error("Ошибка при загрузке одобренных кандидатов", err);
        } finally {
            setLoading(false);
        }
    };

    const removeCandidate = async (id) => {
        if (!window.confirm("Удалить кандидата из списка одобренных?")) return;
        try {
            await api.delete(`/auth/approved-candidates/${id}`);
            setCandidates(prev => prev.filter(c => c.Id !== id));
        } catch (err) {
            alert("Не удалось удалить кандидата");
        }
    };

    const filteredCandidates = candidates.filter(c => 
        c.CandidateProfile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Загрузка...</div>;

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
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-500">Список пока пуст</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCandidates.map((item) => (
                        <div key={item.Id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <User size={24} />
                                </div>
                                <button 
                                    onClick={() => removeCandidate(item.Id)}
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
                                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-1">
                                        <FileText size={12} /> Заметка
                                    </div>
                                    <p className="text-sm text-slate-700 italic">
                                        "{item.notes}"
                                    </p>
                                </div>
                            )}

                            <Button 
                                variant="outline" 
                                className="w-full text-xs font-bold"
                                onClick={() => {/* Логика перехода к профилю */}}
                            >
                                Посмотреть профиль
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApprovedCandidates;