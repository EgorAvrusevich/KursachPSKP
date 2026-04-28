import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Для перехода
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, MapPin, Briefcase } from 'lucide-react';
import api from '../api';

const Home = () => {
  const [vacancies, setVacancies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Загрузка вакансий с учетом поиска
  const fetchVacancies = async (query = '') => {
    try {
      setLoading(true);
      // Путь /auth/vacancies или /vacancies в зависимости от твоего app.js
      const res = await api.get(`/auth/vacancies?search=${query}`);
      setVacancies(res.data);
    } catch (err) {
      console.error("Ошибка при получении вакансий:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVacancies(searchTerm);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      {/* Улучшенный блок поиска */}
      <section className="relative overflow-hidden bg-slate-900 p-10 rounded-3xl shadow-2xl">
        {/* Декоративный элемент фона (опционально) */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-2 text-white tracking-tight">
            Найди работу своей мечты
          </h1>
          <p className="text-blue-100 mb-8 text-lg opacity-80">
            Более 1000 актуальных вакансий для IT-специалистов
          </p>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                size={22}
              />
              <input
                // БЫЛО: text-gray-900
                // СТАЛО: text-white (или text-slate-50)
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/50 text-white text-lg border border-slate-700 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none"
                placeholder="Должность, навыки или стек технологий..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </div>
      </section>

      {/* Список вакансий */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Актуальные предложения</h2>
          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
            {vacancies.length} вакансий
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Поиск лучших предложений...</p>
          </div>
        ) : vacancies.length > 0 ? (
          <div className="grid gap-4">
            {vacancies.map(vacancy => (
              <Card key={vacancy.VacancyId} className="hover:border-blue-400 hover:shadow-xl transition-all duration-300 border-l-8 border-l-blue-600 group p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {vacancy.title}
                    </h3>
                    <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Briefcase size={18} className="text-blue-500" />
                        <span className="font-semibold">{vacancy.Recruiter?.full_name || 'HR-департамент'}</span>
                      </span>
                      <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <MapPin size={18} className="text-red-400" />
                        {vacancy.status === 'open' ? 'Удаленно / Офис' : vacancy.status}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="md:w-auto w-full rounded-xl px-8 border-2 hover:bg-blue-50 transition-colors"
                    onClick={() => navigate(`/vacancy/${vacancy.VacancyId}`)}
                  >
                    Подробнее
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl py-20 text-center border-2 border-dashed border-gray-200">
            <p className="text-xl text-gray-400">Ничего не нашлось. Попробуйте изменить запрос.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;