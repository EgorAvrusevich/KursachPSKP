import React, { useState, useEffect } from 'react';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Heart, HeartOff, MapPin, DollarSign, Briefcase, AlertCircle } from 'lucide-react';

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
                        <Card key={item.SaveId} className="flex justify-between items-center p-5 hover:shadow-md transition-shadow border-l-4 border-l-rose-500">
                            <div className="space-y-1 flex-1">
                                <h3 className="font-bold text-xl text-slate-800">{vacancy.title}</h3>
                                <div className="flex gap-4 items-center mt-2">
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
                                    <span className="text-sm text-gray-400 flex items-center gap-1">
                                        <Briefcase size={14} />
                                        {vacancy.RecruiterProfile?.full_name || vacancy.Recruiter?.full_name || 'Рекрутер'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <Button
                                    variant="outline"
                                    className="text-rose-500 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                                    onClick={() => handleUnsave(item.SaveId)}
                                >
                                    <HeartOff size={16} /> Убрать
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default SavedVacancies;