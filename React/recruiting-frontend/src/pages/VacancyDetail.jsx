import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MapPin, Building2, DollarSign, Calendar } from 'lucide-react';
import api from '../api';

const VacancyDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    // api.get(`/vacancies/${id}`).then(res => setJob(res.data));
    // Заглушка:
    setJob({ 
      title: 'Fullstack Developer (Node.js/React)', 
      company: 'Modsen', 
      description: 'Ищем крутого разраба для работы над HR-платформой. Требования: Node.js, Express, Docker, RabbitMQ.',
      salary: '2500 - 3500$',
      city: 'Минск',
      date: '24.04.2026'
    });
  }, [id]);

  const handleApply = async () => {
    try {
      // await api.post(`/vacancies/${id}/apply`);
      setApplied(true);
    } catch (err) {
      alert('Ошибка при отклике');
    }
  };

  if (!job) return <div className="text-center py-20 text-gray-500 font-bold">Загрузка вакансии...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-t-8 border-t-primary">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-500">
              <span className="flex items-center gap-1 font-semibold text-primary"><Building2 size={18}/> {job.company}</span>
              <span className="flex items-center gap-1"><MapPin size={18}/> {job.city}</span>
              <span className="flex items-center gap-1"><DollarSign size={18}/> {job.salary}</span>
              <span className="flex items-center gap-1"><Calendar size={18}/> {job.date}</span>
            </div>
          </div>
          <Button 
            variant={applied ? "outline" : "secondary"} 
            className="w-full md:w-auto text-lg"
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? 'Вы откликнулись' : 'Откликнуться сейчас'}
          </Button>
        </div>

        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-4">Описание вакансии</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
        </div>
      </Card>
    </div>
  );
};

export default VacancyDetail;