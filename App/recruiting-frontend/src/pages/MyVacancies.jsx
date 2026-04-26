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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-gray-900">Управление вакансиями</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => navigate('/templates/my')}
                    >
                        <Layout size={18} /> Шаблоны чек-листов
                    </Button>
                    <Button
                        onClick={() => navigate('/create-vacancy')}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} /> Создать вакансию
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {myVacancies.length > 0 ? (
                    myVacancies.map(v => (
                        <Card key={v.id} className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{v.title}</h3>
                                <p className="text-sm text-gray-500">Откликов: {v.applicationsCount || 0}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm"><Settings size={16} /></Button>
                                <Button variant="secondary" size="sm">Кандидаты</Button>
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