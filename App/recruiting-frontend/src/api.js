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

export default api;