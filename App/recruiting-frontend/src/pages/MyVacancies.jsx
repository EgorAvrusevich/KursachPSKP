import React, { useState, useEffect } from 'react';
import { Plus, Copy, Settings, Layout, Trash2 } from 'lucide-react'; // Добавил Trash2
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MyVacancies = () => {
    const navigate = useNavigate();
    const [myVacancies, setMyVacancies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVacancies();
    }, []);

    const fetchVacancies = () => {
        api.get('/vacancies/my-vacancies')
            .then(res => {
                setMyVacancies(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Ошибка загрузки:", err);
                setLoading(false);
            });
    };

    // Функция удаления
    const handleDelete = async (id, title) => {
        const confirmDelete = window.confirm(
            `Вы уверены, что хотите удалить вакансию "${title}"?\n\nВНИМАНИЕ: Все отклики и данные, связанные с этой вакансией, будут безвозвратно удалены.`
        );

        if (confirmDelete) {
            try {
                await api.delete(`/vacancies/${id}`);
                // Обновляем локальный стейт, чтобы вакансия исчезла сразу без перезагрузки
                setMyVacancies(prev => prev.filter(v => v.VacancyId !== id));
            } catch (err) {
                console.error("Ошибка при удалении:", err);
                alert("Не удалось удалить вакансию. Попробуйте позже.");
            }
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Загрузка вакансий...</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-black text-slate-800">Мои вакансии</h1>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/templates/my')}
                        className="flex items-center gap-2"
                    >
                        <Layout size={18} /> Шаблоны чек-листов
                    </Button>
                </div>

                {myVacancies.length > 0 ? (
                    myVacancies.map(v => (
                        <Card key={v.VacancyId} className="flex justify-between items-center p-5 hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl text-slate-800">{v.title}</h3>
                                <div className="flex gap-4 items-center">
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                        Всего откликов: <b className="text-slate-900">{v.totalApps ?? 0}</b>
                                    </span>

                                    {v.pendingApps > 0 && (
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            • {v.pendingApps} новых
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {/* Кнопка удаления */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200"
                                    title="Удалить вакансию"
                                    onClick={() => handleDelete(v.VacancyId, v.title)}
                                >
                                    <Trash2 size={18} />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    title="Настройки вакансии"
                                    onClick={() => navigate(`/edit-vacancy/${v.VacancyId}`)}
                                >
                                    <Settings size={18} />
                                </Button>

                                <Button
                                    onClick={() => navigate(`/manage-vacancy/${v.VacancyId}`)}
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
                )}
            </div>
        </div>
    );
};

export default MyVacancies;