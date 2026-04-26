import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const CreateVacancy = () => {
  const [form, setForm] = useState({ title: '', description: '', salary: '', city: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vacancies', form); // Твой эндпоинт на бэкенде
      alert('Вакансия создана!');
      navigate('/');
    } catch (err) {
      alert('Ошибка при создании');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-2xl font-bold mb-6">Новая вакансия</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название должности" placeholder="Напр. Senior .NET Developer" onChange={e => setForm({...form, title: e.target.value})} />
          <Input label="Город" placeholder="Минск" onChange={e => setForm({...form, city: e.target.value})} />
          <Input label="Зарплатная вилка" placeholder="от 2500$" onChange={e => setForm({...form, salary: e.target.value})} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Описание</label>
            <textarea 
              className="border border-gray-300 rounded-lg p-3 min-h-[150px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full">Опубликовать вакансию</Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateVacancy;