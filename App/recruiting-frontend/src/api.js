import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Автоматически добавляем JWT токен в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Перехватчик ответов для обработки 401 ошибки
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Токен протух или невалиден
      localStorage.removeItem('token');
      window.location.href = '/login'; // Жесткий редирект для сброса состояния React
    }
    return Promise.reject(error);
  }
);

export default api;