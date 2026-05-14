import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, ClipboardList } from 'lucide-react';
import api from '../api';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const EditVacancy = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        city: '',
        salary: '',
        checklist: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/vacancies/${id}`);
                setFormData({
                    title: res.data.title || '',
                    description: res.data.description || '',
                    city: res.data.city || '',
                    salary: res.data.salary || '',
                    checklist: res.data.CheckListTemplates || []
                });
                setLoading(false);
            } catch (err) {
                console.error("Ошибка загрузки:", err);
                alert("Не удалось загрузить данные вакансии");
                navigate('/my-vacancies');
            }
        };
        fetchData();
    }, [id, navigate]);

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Введите заголовок вакансии';
        } else if (formData.title.trim().length < 3) {
            newErrors.title = 'Заголовок должен содержать минимум 3 символа';
        }
        if (!formData.city.trim()) {
            newErrors.city = 'Введите город';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Введите описание';
        } else if (formData.description.trim().length < 10) {
            newErrors.description = 'Описание должно содержать минимум 10 символов';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await api.put(`/vacancies/${id}`, {
                title: formData.title,
                description: formData.description,
                city: formData.city,
                salary: formData.salary
            });
            alert("Вакансия успешно обновлена!");
            navigate('/my-vacancies');
        } catch (err) {
            console.error("Ошибка:", err);
            alert("Не удалось сохранить изменения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Загрузка...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                </Button>
                <h1 className="text-3xl font-black text-slate-800">Редактировать вакансию</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                <Card className="p-6 space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2">Основная информация</h2>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Название должности *</label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 outline-none ${errors.title ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                            />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Город *</label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className={`w-full p-3 bg-gray-50 border rounded-xl ${errors.city ? 'border-red-500' : ''}`}
                                />
                                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Зарплата</label>
                                <input
                                    name="salary"
                                    value={formData.salary}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 border rounded-xl"
                                    placeholder="Напр: 1000$"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Описание *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={6}
                                className={`w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 outline-none ${errors.description ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                            />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-4 bg-gray-50/50">
                    <div className="flex justify-between items-center border-b pb-2">
                        <div className="flex items-center gap-2 text-slate-600">
                            <ClipboardList size={20} />
                            <h2 className="text-xl font-bold">Этапы подбора</h2>
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                            Только для чтения
                        </span>
                    </div>
                    <div className="space-y-2">
                        {formData.checklist.length > 0 ? (
                            formData.checklist.map((stage, index) => (
                                <div key={index} className="flex items-center gap-3 bg-white p-3 border border-gray-100 rounded-xl shadow-sm">
                                    <span className="flex items-center justify-center font-bold text-blue-600 bg-blue-50 w-8 h-8 rounded-full text-sm">
                                        {index + 1}
                                    </span>
                                    <span className="text-slate-700 font-medium">{stage.stage_name}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 py-4 italic text-sm">Этапы для этой вакансии не были заданы.</p>
                        )}
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/my-vacancies')}>
                        Отмена
                    </Button>
                    <Button type="submit" disabled={saving} className="flex gap-2 px-8">
                        <Save size={18} /> {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditVacancy;