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
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Введите ФИО';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'ФИО должно содержать минимум 2 символа';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }
    if (!['Candidate', 'Recruiter'].includes(formData.role)) {
      newErrors.role = 'Выберите роль';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    try {
      await api.post('/auth/register', formData);
      navigate('/login');
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

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <Input
            label="ФИО"
            placeholder="Иванов Иван Иванович"
            value={formData.fullName}
            onChange={(e) => { setFormData({...formData, fullName: e.target.value}); setErrors(prev => ({ ...prev, fullName: '' })); }}
            error={errors.fullName}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="example@mail.com"
            value={formData.email}
            onChange={(e) => { setFormData({...formData, email: e.target.value}); setErrors(prev => ({ ...prev, email: '' })); }}
            error={errors.email}
            required
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => { setFormData({...formData, password: e.target.value}); setErrors(prev => ({ ...prev, password: '' })); }}
            error={errors.password}
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
            {errors.role && <p className="text-red-500 text-xs">{errors.role}</p>}
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