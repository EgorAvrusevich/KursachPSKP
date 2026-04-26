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
    <div className="space-y-8">
      {/* Поиск */}
      <form onSubmit={handleSearch} className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white">
        <h1 className="text-3xl font-bold mb-4">Найди работу своей мечты</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none"
              placeholder="Должность, компания или навыки..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" className="h-[52px] px-8">Найти</Button>
        </div>
      </form>

      {/* Список вакансий */}
      <div className="grid gap-4">
        <h2 className="text-xl font-bold text-gray-800">Актуальные предложения</h2>

        {loading ? (
          <div className="text-center py-10">Загрузка вакансий...</div>
        ) : vacancies.length > 0 ? (
          vacancies.map(vacancy => (
            // Используем vacancy.VacancyId, так как это прописано в модели
            <Card key={vacancy.VacancyId} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{vacancy.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                    {/* Если данных о компании/городе/зарплате нет в БД, добавь проверку */}
                    <span className="flex items-center gap-1">
                      <Briefcase size={16} /> {vacancy.Recruiter?.full_name || 'Компания'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={16} /> {vacancy.status}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="md:w-auto w-full"
                  onClick={() => navigate(`/vacancy/${vacancy.VacancyId}`)} // Тут тоже VacancyId
                >
                  Подробнее
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500">По вашему запросу ничего не найдено</div>
        )}
      </div>
    </div>
  );
};

export default Home;