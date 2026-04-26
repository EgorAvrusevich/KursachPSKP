import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Candidate'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      navigate('/login'); // После регистрации отправляем на логин
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-accent/10 p-3 rounded-full mb-4">
            <UserPlus className="text-accent w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Регистрация</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input 
            label="ФИО" 
            placeholder="Иванов Иван Иванович"
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
          />
          <Input 
            label="Email" 
            type="email" 
            placeholder="example@mail.com"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <Input 
            label="Пароль" 
            type="password" 
            placeholder="••••••••"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Я хочу:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, role: 'Candidate'})}
                className={`py-2 rounded-lg border-2 transition-all ${formData.role === 'Candidate' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
              >
                Найти работу
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, role: 'Recruiter'})}
                className={`py-2 rounded-lg border-2 transition-all ${formData.role === 'Recruiter' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
              >
                Нанять сотрудника
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <Button type="submit" variant="secondary" className="w-full py-3">
            Создать аккаунт
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Register;