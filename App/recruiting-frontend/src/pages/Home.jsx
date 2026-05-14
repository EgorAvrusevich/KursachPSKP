import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, MapPin, Briefcase, X, SlidersHorizontal, Banknote } from 'lucide-react';
import api from '../api';

// Простая реализация debounce, чтобы не зависеть от сторонних библиотек
const debounce = (func, delay) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

const Home = () => {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [city, setCity] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');

  // Основная функция загрузки с учетом всех фильтров
  const fetchVacancies = async (params) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.city) queryParams.append('city', params.city);
      // Если на бэкенде еще нет фильтра по зарплате, он просто проигнорирует этот параметр
      if (params.salary) queryParams.append('salary', params.salary);

      const res = await api.get(`/auth/vacancies?${queryParams.toString()}`);
      setVacancies(res.data);
    } catch (err) {
      console.error("Ошибка при получении вакансий:", err);
    } finally {
      setLoading(false);
    }
  };

  // Дебаунс для предотвращения лишних запросов
  const debouncedFetch = useCallback(
    debounce((params) => fetchVacancies(params), 500),
    []
  );

  // Вызываем поиск при изменении любого фильтра
  useEffect(() => {
    const params = { search: searchTerm, city, salary: salaryFilter };
    debouncedFetch(params);
    return () => debouncedFetch.cancel();
  }, [searchTerm, city, salaryFilter, debouncedFetch]);

  const resetFilters = () => {
    setSearchTerm('');
    setCity('');
    setSalaryFilter('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4">
      {/* Hero Section с Поиском */}
      <section className="relative overflow-hidden bg-slate-900 p-8 md:p-12 rounded-[2rem] shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-25"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black mb-3 text-white leading-tight">
              Твоя карьера <span className="text-blue-400">начинается здесь</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Найди идеальную роль среди проверенных IT-компаний
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Поисковая строка */}
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={24} />
              <input
                className="w-full pl-14 pr-12 py-5 rounded-2xl bg-slate-800/80 text-white text-xl border border-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="Профессия или технологии..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Панель дополнительных фильтров */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 text-slate-200 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">Все города</option>
                  <option value="Минск">Минск</option>
                  <option value="Брест">Брест</option>
                  <option value="Гомель">Гомель</option>
                  <option value="Удаленно">Удаленно</option>
                </select>
              </div>

              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                  value={salaryFilter}
                  onChange={(e) => setSalaryFilter(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 text-slate-200 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">Любая зарплата</option>
                  <option value="1000">От 1000$</option>
                  <option value="2000">От 2000$</option>
                  <option value="3000">От 3000$</option>
                </select>
              </div>

              <Button 
                variant="secondary" 
                onClick={resetFilters}
                className="bg-slate-700 hover:bg-slate-600 text-white border-none py-3 h-auto rounded-xl"
              >
                Сбросить фильтры
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Список контента */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal size={24} className="text-blue-600" />
            {searchTerm || city ? 'Результаты поиска' : 'Все вакансии'}
          </h2>
          <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full shadow-sm">
            {vacancies.length} позиций
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : vacancies.length > 0 ? (
          <div className="grid gap-4">
            {vacancies.map(v => (
              <Card key={v.VacancyId} className="group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 border-l-8 border-l-blue-600 overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-3 flex-grow">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {v.title}
                      </h3>
                      {v.salary && (
                        <span className="bg-green-100 text-green-700 text-xs font-black px-2.5 py-1 rounded-md">
                          {v.salary}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-slate-500 text-sm">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        <Briefcase size={16} className="text-blue-500" />
                        <span className="font-medium text-slate-700">{v.RecruiterProfile?.full_name || 'Modsen'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        <MapPin size={16} className="text-red-400" />
                        <span>{v.city || 'Удаленно'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => navigate(`/vacancy/${v.VacancyId}`)}
                    className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
                  >
                    Смотреть
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
              <Search className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ничего не найдено</h3>
            <p className="text-slate-500 mb-6">Попробуйте смягчить условия поиска или изменить город</p>
            <Button onClick={resetFilters} variant="outline" className="border-2">Показать все вакансии</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;