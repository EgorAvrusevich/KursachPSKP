import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MapPin, DollarSign, Calendar, Briefcase, AlignLeft, UserCircle, ShieldCheck, Heart, HeartOff } from 'lucide-react';
import api from '../api';

const VacancyDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);

  const userRole = localStorage.getItem('role');
  const isRecruiter = userRole === 'Recruiter';
  const isAuthenticated = !!localStorage.getItem('token');

  // Проверяем, сохранена ли вакансия в избранном
  useEffect(() => {
    const checkSaved = async () => {
      if (!isAuthenticated) {
        setCheckingSaved(false);
        return;
      }
      try {
        const res = await api.get('/saved-vacancies');
        const isSaved = res.data.some(s => s.vacancy_id === Number(id));
        setSaved(isSaved);
      } catch (err) {
        console.error("Ошибка проверки избранного:", err);
      } finally {
        setCheckingSaved(false);
      }
    };
    checkSaved();
  }, [id, isAuthenticated]);

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

  const handleSave = async () => {
    try {
      if (saved) {
        const res = await api.get('/saved-vacancies');
        const record = res.data.find(s => s.vacancy_id === Number(id));
        if (record) {
          await api.delete(`/saved-vacancies/${record.SaveId}`);
        }
        setSaved(false);
      } else {
        await api.post(`/saved-vacancies/${id}`);
        setSaved(true);
      }
    } catch (err) {
      console.error("Ошибка при сохранении:", err);
    }
  };

  if (loading || checkingSaved) return <div className="text-center py-20 text-gray-500 font-bold italic">Загрузка вакансии...</div>;
  if (!job) return <div className="text-center py-20 text-red-500 font-bold">Вакансия не найдена.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 animate-in fade-in duration-500">
      <Card className="overflow-hidden border-none shadow-2xl bg-white">
        <div className="h-2 bg-blue-600 w-full"></div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 pb-8 border-b border-gray-100">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {job.title}
                </h1>
                {isAuthenticated && !isRecruiter && (
                  <button
                    onClick={handleSave}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    title={saved ? "Убрать из избранного" : "Сохранить в избранное"}
                  >
                    {saved ? (
                      <HeartOff size={20} className="text-rose-500" />
                    ) : (
                      <Heart size={20} className="text-slate-400 hover:text-rose-500" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-y-3 gap-x-6">
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <MapPin size={18} className="text-blue-500" />
                  <span className="font-medium">{job.city || 'Удаленно / Город не указан'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <DollarSign size={18} className="text-green-600" />
                  <span className="font-bold">{job.salary || 'З/П по результатам'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-500 py-1.5">
                  <Calendar size={18} />
                  <span>{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

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

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3">
                  <UserCircle size={20} className="text-blue-600" />
                  <h4 className="font-bold">Рекрутер</h4>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-slate-900 leading-tight">
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
                  <h4 className="font-bold">Информация</h4> {/* Переименовали из Статус вакансии */}
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500 text-white">
                  Доступна для отклика
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