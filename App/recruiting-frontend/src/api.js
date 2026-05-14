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

// ===== АДМИН: Пользователи =====

// Получить список пользователей
export const fetchUsers = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append('search', params.search);
  if (params.role) queryParams.append('role', params.role);
  if (params.isBlocked !== undefined) queryParams.append('isBlocked', params.isBlocked);
  queryParams.append('page', params.page || 1);
  queryParams.append('limit', params.limit || 10);
  return api.get(`/admin/users?${queryParams.toString()}`);
};

// Заблокировать пользователя
export const blockUser = (userId) => api.put(`/admin/users/${userId}/block`);

// Разблокировать пользователя
export const unblockUser = (userId) => api.put(`/admin/users/${userId}/unblock`);

// Удалить пользователя
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

// ===== АДМИН: Заявки =====

// Получить заявки
export const fetchApplications = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.vacancyId) queryParams.append('vacancyId', params.vacancyId);
  queryParams.append('page', params.page || 1);
  queryParams.append('limit', params.limit || 20);
  return api.get(`/admin/applications?${queryParams.toString()}`);
};

// Удалить заявку (админ)
export const deleteApplicationAdmin = (applicationId) => api.delete(`/admin/applications/${applicationId}`);

// ===== АДМИН: Панель управления =====

// Получить статистику
export const fetchDashboard = () => api.get('/admin/dashboard');

// ===== АДМИН: Модерация вакансий =====

// Получить вакансии для модерации
export const fetchVacanciesForModeration = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  queryParams.append('page', params.page || 1);
  queryParams.append('limit', params.limit || 10);
  return api.get(`/admin/vacancies?${queryParams.toString()}`);
};

// Удалить вакансию (админ)
export const deleteVacancyAdmin = (vacancyId) => api.delete(`/admin/vacancies/${vacancyId}`);

// ===== АДМИН: Глобальные шаблоны =====

// Получить глобальные шаблоны
export const fetchGlobalTemplates = () => api.get('/admin/templates');

// Создать глобальный шаблон
export const createGlobalTemplate = (data) => api.post('/admin/templates', data);

// Удалить глобальный шаблон
export const deleteGlobalTemplate = (templateId) => api.delete(`/admin/templates/${templateId}`);

export default api;