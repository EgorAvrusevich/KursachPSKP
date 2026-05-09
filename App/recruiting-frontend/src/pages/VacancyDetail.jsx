import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MapPin, DollarSign, Calendar, Briefcase, AlignLeft, UserCircle, ShieldCheck } from 'lucide-react';
import api from '../api';

const VacancyDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem('role');
  const isRecruiter = userRole === 'Recruiter';
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
        setLoading(false);
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

  if (loading) return <div className="text-center py-20 text-gray-500 font-bold italic">Загрузка вакансии...</div>;
  if (!job) return <div className="text-center py-20 text-red-500 font-bold">Вакансия не найдена.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 animate-in fade-in duration-500">
      <Card className="overflow-hidden border-none shadow-2xl bg-white">
        {/* Декоративная полоса сверху */}
        <div className="h-2 bg-blue-600 w-full"></div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 pb-8 border-b border-gray-100">
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap gap-y-3 gap-x-6">
                {/* Город */}
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <MapPin size={18} className="text-blue-500" />
                  <span className="font-medium">{job.city || 'Удаленно / Город не указан'}</span>
                </div>

                {/* Зарплата */}
                <div className="flex items-center gap-2 text-slate-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <DollarSign size={18} className="text-green-600" />
                  <span className="font-bold">{job.salary || 'З/П по результатам'}</span>
                </div>

                {/* Дата */}
                <div className="flex items-center gap-2 text-slate-500 py-1.5">
                  <Calendar size={18} />
                  <span>{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Кнопка отклика */}
            {isAuthenticated && !isRecruiter && (
              <Button
                variant={applied ? "outline" : "primary"}
                className={`w-full md:w-auto min-w-[200px] h-14 rounded-xl text-lg font-bold transition-all shadow-lg shadow-blue-200 active:scale-95 ${!applied && 'hover:shadow-blue-300'}`}
                onClick={handleApply}
                disabled={applied}
              >
                {applied ? 'Вы уже откликнулись' : 'Откликнуться сейчас'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Левая колонка - Основной контент */}
            <div className="md:col-span-2 space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-4 text-slate-800">
                  <AlignLeft size={22} className="text-blue-600" />
                  <h3 className="text-xl font-bold">Описание вакансии</h3>
                </div>
                <div className="text-slate-700 leading-relaxed text-lg bg-slate-50/50 p-6 rounded-2xl border border-slate-100 whitespace-pre-line">
                  {job.description || "Описание вакансии не предоставлено рекрутером."}
                </div>
              </section>
            </div>

            {/* Правая колонка - Карточка статуса */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3">
                  <UserCircle size={20} className="text-blue-600" />
                  <h4 className="font-bold">Рекрутер</h4>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {/* Обращаемся к данным из Profile через алиас */}
                      {job.RecruiterProfile?.full_name || 'Загрузка имени...'}
                    </span>
                    <ShieldCheck size={16} className="text-blue-500" title="Проверенный рекрутер" />
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Ответственный за найм
                  </span>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={20} className="text-blue-400" />
                  <h4 className="font-bold">Статус вакансии</h4>
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500 text-white">
                  {job.status === 'open' ? 'Активна' : 'Закрыта'}
                </div>
                <p className="mt-4 text-sm text-slate-400 leading-snug">
                  Ваш отклик будет мгновенно доставлен рекрутеру проекта HireVich.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VacancyDetail;