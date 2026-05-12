import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { HeartOff, MapPin, DollarSign, Briefcase, AlertCircle, ArrowRight } from 'lucide-react';

const SavedVacancies = () => {
    const [saved, setSaved] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSaved();
    }, []);

    const fetchSaved = async () => {
        try {
            const res = await api.get('/saved-vacancies');
            setSaved(res.data);
        } catch (err) {
            console.error("Ошибка загрузки избранного:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (saveId) => {
        try {
            await api.delete(`/saved-vacancies/${saveId}`);
            setSaved(prev => prev.filter(s => s.SaveId !== saveId));
        } catch (err) {
            console.error("Ошибка удаления из избранного:", err);
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500">Загрузка избранных вакансий...</div>;

    if (saved.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h1 className="text-3xl font-black text-slate-800 mb-4">Избранные вакансии</h1>
                <div className="p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    Вы пока ничего не сохранили. Исследуйте вакансии и сохраняйте интересные!
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-black text-slate-800">Избранные вакансии</h1>

            <div className="grid gap-4">
                {saved.map(item => {
                    const vacancy = item.Vacancy;
                    if (!vacancy) return null;

                    return (
                        <Card key={item.SaveId} className="p-5 hover:shadow-md transition-shadow border-l-4 border-l-rose-500 group">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1 cursor-pointer" onClick={() => window.location.href = `/vacancy/${vacancy.VacancyId}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-xl text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {vacancy.title}
                                        </h3>
                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    {vacancy.description && (
                                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                            {vacancy.description.length > 150
                                                ? vacancy.description.substring(0, 150) + '...'
                                                : vacancy.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                            <MapPin size={14} className="text-gray-400" />
                                            {vacancy.city || 'Удаленно'}
                                        </span>
                                        {vacancy.salary && (
                                            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                                                <DollarSign size={14} />
                                                {vacancy.salary}
                                            </span>
                                        )}
                                        {vacancy.RecruiterProfile?.full_name && (
                                            <span className="text-sm text-gray-400 flex items-center gap-1">
                                                <Briefcase size={14} />
                                                {vacancy.RecruiterProfile.full_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        className="text-rose-500 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                                        onClick={() => handleUnsave(item.SaveId)}
                                    >
                                        <HeartOff size={16} /> Убрать
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => window.location.href = `/vacancy/${vacancy.VacancyId}`}
                                    >
                                        Подробнее
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default SavedVacancies;