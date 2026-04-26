import axios from 'axios';

const api = axios.create({
  // Порт 3000, на котором работает твой recruiting_api
  baseURL: 'http://localhost:3000/api', 
});

// Автоматически добавляем JWT токен в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;