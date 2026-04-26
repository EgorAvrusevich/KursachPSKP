import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // тот самый файл из Шага 4
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Сохраняем токен и роль, которые прислал твой контроллер
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      
      // Редирект на главную или дашборд
      navigate('/'); 
    } catch (err) {
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

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Email" 
            type="email" 
            placeholder="admin@hirevich.by" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label="Пароль" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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