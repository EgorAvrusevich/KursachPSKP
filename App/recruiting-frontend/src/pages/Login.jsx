import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Некорректный формат email';
    }
    if (!password) {
      newErrors.password = 'Введите пароль';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    try {
      const response = await api.post('/auth/login', { email, password });
      login({
        token: response.data.token,
        role: response.data.role
      });
      navigate('/');
    } catch (err) {
      if (err.response?.data?.is_blocked) {
        alert('Ваш аккаунт заблокирован. Обратитесь к администратору.');
        return;
      }
      setError(err.response?.data?.message || 'Ошибка при входе');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <LogIn className="text-primary w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Вход в HireVich</h1>
          <p className="text-gray-500 text-sm">Введите свои данные для доступа</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="admin@hirevich.by"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
            error={errors.email}
            required
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
            error={errors.password}
            required
          />

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <Button type="submit" className="w-full py-3">
            Войти в систему
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Нет аккаунта? <a href="/register" className="text-accent font-bold hover:underline">Зарегистрироваться</a>
        </div>
      </Card>
    </div>
  );
};

export default Login;