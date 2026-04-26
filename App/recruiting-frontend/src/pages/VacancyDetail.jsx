import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MapPin, Building2, DollarSign, Calendar } from 'lucide-react';
import api from '../api';

const VacancyDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null); // Используем job, так как он в JSX
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem('role');
  const isRecruiter = userRole === 'Recruiter';
  const isApplicant = userRole === 'Applicant';
  // Если нужно проверять авторизацию вообще:
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    const fetchVacancy = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/vacancies/${id}`);
        setJob(res.data);
      } catch (err) {
        console.error("Ошибка загрузки:", err);
      } finally {
        setLoading(false); // Выключаем индикатор загрузки
      }
    };
    fetchVacancy();
  }, [id]);

  const handleApply = async () => {
    try {
      await api.post(`/vacancies/${id}/apply`);
      setApplied(true);
      alert('Ваш отклик успешно отправлен!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка при отклике';
      alert(msg);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500 font-bold italic">Поиск вакансии в базе...</div>;

  if (!job) return <div className="text-center py-20 text-red-500 font-bold">Вакансия не найдена.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Card className="border-t-8 border-t-blue-600 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 border-b border-gray-100 pb-6">
          <div>
            {/* Теперь job.title будет работать, так как мы сделали setJob(res.data) */}
            <h1 className="text-3xl font-black text-gray-900 mb-2 leading-tight">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-500">
              <span className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <Building2 size={16} /> {job.company || 'Компания не указана'}
              </span>
              <span className="flex items-center gap-1"><MapPin size={18} /> {job.city || 'Город не указан'}</span>
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <DollarSign size={18} className="text-green-600" /> {job.salary || 'З/П по результатам собеседования'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={18} /> {new Date(job.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
          {/* 2. Условие: показываем кнопку только если пользователь НЕ рекрутер */}
          {isAuthenticated && !isRecruiter && (
            <Button
              variant={applied ? "outline" : "primary"}
              className={`w-full md:w-auto text-lg px-8 py-6 rounded-2xl transition-all ${!applied && 'hover:scale-105 shadow-lg'}`}
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? 'Вы уже откликнулись' : 'Откликнуться сейчас'}
            </Button>)}
        </div>

        <div className="prose max-w-none">
          <div className="bg-gray-50 p-4 rounded-xl mb-6 border-l-4 border-blue-600">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Краткое описание</h3>
            <p className="text-gray-600 italic">Навыки: {job.requirements || 'Не указаны'}</p>
          </div>

          <h3 className="text-xl font-bold mb-4 text-gray-900">Полное описание вакансии</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
            {job.description}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default VacancyDetail;