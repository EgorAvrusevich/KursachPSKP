import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Calendar, Video, ChevronRight, Trash2 } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ email: '', role: '', Profile: {} });
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, interviewsRes] = await Promise.all([
          api.get('/auth/profile'),
          api.get('/interviews/my')
        ]);
        setData(profileRes.data);
        setInterviews(interviewsRes.data);
      } catch (err) {
        console.error("Ошибка загрузки данных", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const validate = () => {
    const newErrors = {};
    const fullName = data.Profile?.full_name || '';
    const phone = data.Profile?.phone || '';

    if (!fullName.trim()) {
      newErrors.full_name = 'Введите ФИО';
    } else if (fullName.trim().length < 2) {
      newErrors.full_name = 'ФИО должно содержать минимум 2 символа';
    }

    if (phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(phone)) {
      newErrors.phone = 'Некорректный формат телефона';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await api.put('/auth/profile', {
        full_name: data.Profile.full_name,
        phone: data.Profile.phone,
        bio: data.Profile.bio
      });
      alert("Данные сохранены!");
    } catch (err) {
      alert("Ошибка сохранения");
    }
  };

  const handleDelete = async (id, isFuture) => {
    const confirmMsg = isFuture
      ? "Вы уверены, что хотите отменить интервью? Собеседник получит уведомление об отмене."
      : "Удалить запись об интервью из истории?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/interviews/${id}`);
      setInterviews(interviews.filter(i => i.InterviewId !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Не удалось удалить интервью");
    }
  };

  if (loading) return <div className="p-20 text-center text-gray-500 animate-pulse">Загрузка профиля...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Личный кабинет</h1>
          <p className="text-gray-500 mt-1">{data.email}</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto border border-gray-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Настройки
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`flex-1 md:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'interviews' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Интервью
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
        {activeTab === 'settings' ? (
          <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300" noValidate>
            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Роль в системе</span>
                <div className="mt-1.5 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-600 font-medium">
                  {data.role === 'Recruiter' ? 'Рекрутер' : 'Кандидат'}
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">ФИО *</span>
                <Input
                  className="mt-1.5"
                  value={data.Profile?.full_name || ''}
                  onChange={e => { setData({ ...data, Profile: { ...data.Profile, full_name: e.target.value } }); setErrors(prev => ({ ...prev, full_name: '' })); }}
                  error={errors.full_name}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Телефон</span>
                <Input
                  className="mt-1.5"
                  placeholder="+375 (__) ___-__-__"
                  value={data.Profile?.phone || ''}
                  onChange={e => { setData({ ...data, Profile: { ...data.Profile, phone: e.target.value } }); setErrors(prev => ({ ...prev, phone: '' })); }}
                  error={errors.phone}
                />
              </label>
            </div>

            <div className="space-y-5">
              <label className="block h-full flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {data.role === 'Candidate' ? 'О себе / Резюме' : 'Описание компании'}
                </span>
                <textarea
                  className="flex-1 w-full mt-1.5 p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all resize-none min-h-[200px]"
                  value={data.Profile?.bio || ''}
                  onChange={e => setData({ ...data, Profile: { ...data.Profile, bio: e.target.value } })}
                />
              </label>
            </div>

            <div className="md:col-span-2 pt-4">
              <Button type="submit" variant="primary" className="w-full md:w-auto px-16 h-14 rounded-2xl shadow-lg shadow-blue-100">
                Сохранить профиль
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-8 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Video className="text-blue-600" size={24} />
              Ваши встречи
            </h2>

            <div className="space-y-4">
              {interviews.length > 0 ? (
                interviews.map((item) => {
                  const rawDate = new Date(item.scheduled_at);
                  const scheduledDate = new Date(rawDate.getTime() + (rawDate.getTimezoneOffset() * 60000));
                  const isPast = scheduledDate < new Date();
                  const displayTime = scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={item.InterviewId} className={`group flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-300 ${isPast ? 'bg-gray-50/40 border-gray-100 opacity-80' : 'bg-white border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                          <Calendar size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800">
                            {data.role === 'Recruiter'
                              ? (item.Application?.Candidate?.Profile?.full_name || 'Кандидат')
                              : (item.Application?.Vacancy?.title || 'Собеседование')}
                          </h4>
                          <p className="text-sm font-semibold text-slate-400 mt-1">
                            {scheduledDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })} в {displayTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isPast && (
                          <button
                            onClick={() => navigate(`/interview/${item.InterviewId}`)}
                            className="flex items-center gap-2 px-7 h-12 bg-[#1a68ff] hover:bg-blue-700 text-white text-[15px] font-bold rounded-2xl transition-all shadow-lg shadow-blue-200/50"
                          >
                            <Video size={18} fill="currentColor" /> Войти
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/vacancies/${item.Application?.vacancy_id}`)}
                          className="flex items-center justify-center w-12 h-12 bg-white border border-gray-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.InterviewId, !isPast)}
                          className="flex items-center justify-center w-12 h-12 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          title={!isPast ? "Отменить интервью" : "Удалить из истории"}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                    <Video size={32} />
                  </div>
                  <p className="text-gray-400 font-medium italic">У вас пока не назначено ни одного интервью</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;