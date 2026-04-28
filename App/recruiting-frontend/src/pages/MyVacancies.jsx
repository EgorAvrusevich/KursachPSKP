import React, { useState, useEffect } from 'react';
import { Plus, Copy, Settings, Layout } from 'lucide-react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MyVacancies = () => {
    const navigate = useNavigate();
    const [myVacancies, setMyVacancies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/vacancies/my-vacancies')
            .then(res => {
                setMyVacancies(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Ошибка загрузки:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center animate-pulse">Загрузка вакансий...</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {myVacancies.length > 0 ? (
                    myVacancies.map(v => (
                        <Card key={v.VacancyId} className="flex justify-between items-center p-5 hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl text-slate-800">{v.title}</h3>
                                <div className="flex gap-4 items-center">
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                        {/* Убираем .dataValues, оставляем просто v.totalApps */}
                                        Всего откликов: <b className="text-slate-900">{v.totalApps ?? 0}</b>
                                    </span>

                                    {/* Проверяем наличие новых откликов напрямую */}
                                    {v.pendingApps > 0 && (
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            • {v.pendingApps} новых
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title="Настройки вакансии"
                                    onClick={() => navigate(`/edit-vacancy/${v.VacancyId}`)}
                                >
                                    <Settings size={18} />
                                </Button>
                                <Button
                                    onClick={() => navigate(`/manage-vacancy/${v.VacancyId}`)} // Поправил v.VacancyId
                                    variant="secondary"
                                    className="font-bold"
                                >
                                    Кандидаты
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500">У вас еще нет созданных вакансий</p>
                    </div>
                )
                }
            </div>
        </div>
    );
};

export default MyVacancies;