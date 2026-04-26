import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, MapPin, Briefcase } from 'lucide-react';
import api from '../api';

const Home = () => {
  const [vacancies, setVacancies] = useState([
    { id: 1, title: 'Node.js Developer', company: 'HireVich Team', city: 'Минск', salary: '2000$', type: 'Remote' },
    { id: 2, title: 'React Engineer', company: 'Modsen', city: 'Гродно', salary: '1500$', type: 'Hybrid' }
  ]);

  // Раскомментируй, когда на бэкенде будет готов GET /api/vacancies
  /*
  useEffect(() => {
    api.get('/vacancies').then(res => setVacancies(res.data));
  }, []);
  */

  return (
    <div className="space-y-8">
      {/* Поиск */}
      <div className="bg-primary p-8 rounded-2xl shadow-lg text-white">
        <h1 className="text-3xl font-bold mb-4">Найди работу своей мечты</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none" 
              placeholder="Должность или навыки..."
            />
          </div>
          <Button variant="secondary" className="h-[52px]">Найти</Button>
        </div>
      </div>

      {/* Список вакансий */}
      <div className="grid gap-4">
        <h2 className="text-xl font-bold text-gray-800">Актуальные предложения</h2>
        {vacancies.map(job => (
          <Card key={job.id} className="hover:shadow-md transition-shadow border-l-4 border-l-accent">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary">{job.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><Briefcase size={16}/> {job.company}</span>
                  <span className="flex items-center gap-1"><MapPin size={16}/> {job.city}</span>
                  <span className="text-accent font-bold">{job.salary}</span>
                </div>
              </div>
              <Button variant="outline" className="md:w-auto w-full">Подробнее</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;