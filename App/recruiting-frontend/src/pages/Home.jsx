import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, MapPin, Briefcase, X, SlidersHorizontal, Banknote, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';

const debounce = (func, delay) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'oldest', label: 'Старые' },
  { value: 'salary_desc', label: 'Зарплата ↓' },
  { value: 'salary_asc', label: 'Зарплата ↑' },
  { value: 'title_asc', label: 'А-Я' },
  { value: 'title_desc', label: 'Я-А' },
];

const SALARY_OPTIONS = [
  { value: '', label: 'Любая зарплата' },
  { value: '1000', label: 'От 1000$' },
  { value: '2000', label: 'От 2000$' },
  { value: '3000', label: 'От 3000$' },
  { value: '5000', label: 'От 5000$' },
];

const ITEMS_PER_PAGE = 10;

const Home = () => {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [city, setCity] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Получаем список городов из вакансий
  const availableCities = useMemo(() => {
    const cities = new Set(vacancies.map(v => v.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [vacancies]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const fetchVacancies = async (params) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.city) queryParams.append('city', params.city);
      if (params.salary) queryParams.append('salary', params.salary);
      queryParams.append('sort', params.sort || 'newest');
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', ITEMS_PER_PAGE);

      const res = await api.get(`/auth/vacancies?${queryParams.toString()}`);
      setVacancies(res.data.vacancies || res.data);
      setTotalCount(res.data.total || res.data.length);
    } catch (err) {
      console.error("Ошибка при получении вакансий:", err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce((params) => fetchVacancies(params), 400),
    []
  );

  useEffect(() => {
    const params = { search: searchTerm, city, salary: salaryFilter, sort: sortBy, page: currentPage };
    debouncedFetch(params);
    return () => debouncedFetch.cancel();
  }, [searchTerm, city, salaryFilter, sortBy, currentPage, debouncedFetch]);

  const resetFilters = () => {
    setSearchTerm('');
    setCity('');
    setSalaryFilter('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || city || salaryFilter || sortBy !== 'newest';

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
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Панель фильтров */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Город */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <select
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 text-slate-200 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Все города</option>
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Зарплата */}
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <select
                  value={salaryFilter}
                  onChange={(e) => { setSalaryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 text-slate-200 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  {SALARY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Сортировка */}
              <div className="relative">
                <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 text-slate-200 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Сброс */}
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  onClick={resetFilters}
                  className="bg-slate-700 hover:bg-slate-600 text-white border-none py-3 h-auto rounded-xl flex items-center justify-center gap-2"
                >
                  <X size={16} /> Сбросить
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Список вакансий */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal size={24} className="text-blue-600" />
            {searchTerm || city || salaryFilter ? 'Результаты поиска' : 'Все вакансии'}
          </h2>
          <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full shadow-sm">
            {totalCount} {totalCount === 1 ? 'позиция' : totalCount < 5 ? 'позиции' : 'позиций'}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : vacancies.length > 0 ? (
          <>
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
                          <span className="font-medium text-slate-700">{v.RecruiterProfile?.full_name || 'Не указан'}</span>
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

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
              <Search className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ничего не найдено</h3>
            <p className="text-slate-500 mb-6">Попробуйте смягчить условия поиска или изменить фильтры</p>
            <Button onClick={resetFilters} variant="outline" className="border-2">Показать все вакансии</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;