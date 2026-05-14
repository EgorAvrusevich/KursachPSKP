import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchVacanciesForModeration,
  fetchApplications,
  deleteVacancyAdmin,
  deleteApplicationAdmin,
  fetchDashboard
} from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  AlertTriangle, CheckCircle, XCircle, Trash2,
  Search, SlidersHorizontal, FileText, Briefcase,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const AdminModeration = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vacancies');

  // --- Vacancies state ---
  const [vacancies, setVacancies] = useState([]);
  const [vacancySearch, setVacancySearch] = useState('');
  const [vacancyPage, setVacancyPage] = useState(1);
  const [vacancyTotalPages, setVacancyTotalPages] = useState(1);
  const [vacancyTotal, setVacancyTotal] = useState(0);

  // --- Applications state ---
  const [applications, setApplications] = useState([]);
  const [appStatus, setAppStatus] = useState('all');
  const [appPage, setAppPage] = useState(1);
  const [appTotalPages, setAppTotalPages] = useState(1);
  const [appTotal, setAppTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState(null);

  const loadVacancies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchVacanciesForModeration({
        search: vacancySearch,
        page: vacancyPage,
        limit: 10
      });
      setVacancies(res.data.vacancies);
      setVacancyTotalPages(res.data.totalPages);
      setVacancyTotal(res.data.total);
    } catch (err) {
      console.error("Ошибка загрузки вакансий:", err);
    } finally {
      setLoading(false);
    }
  }, [vacancySearch, vacancyPage]);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApplications({
        status: appStatus,
        page: appPage,
        limit: 20
      });
      setApplications(res.data.applications);
      setAppTotalPages(res.data.totalPages);
      setAppTotal(res.data.total);
    } catch (err) {
      console.error("Ошибка загрузки заявок:", err);
    } finally {
      setLoading(false);
    }
  }, [appStatus, appPage]);

  useEffect(() => {
    if (activeTab === 'vacancies') {
      loadVacancies();
    } else {
      loadApplications();
    }
    // Load stats once
    const loadStats = async () => {
      try {
        const res = await fetchDashboard();
        setStats(res.data);
      } catch (err) {
        console.error("Ошибка загрузки статистики:", err);
      }
    };
    loadStats();
  }, [activeTab, loadVacancies, loadApplications]);

  const handleDeleteVacancy = async (vacancyId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту вакансию и все связанные отклики?')) return;
    setActionLoading(prev => ({ ...prev, [vacancyId]: true }));
    try {
      await deleteVacancyAdmin(vacancyId);
      loadVacancies();
    } catch (err) {
      console.error("Ошибка удаления вакансии:", err);
      alert(`Ошибка: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vacancyId]: false }));
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заявку?')) return;
    setActionLoading(prev => ({ ...prev, [appId]: true }));
    try {
      await deleteApplicationAdmin(appId);
      loadApplications();
    } catch (err) {
      console.error("Ошибка удаления заявки:", err);
      alert(`Ошибка: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Новый': 'bg-orange-100 text-orange-800',
      'На рассмотрении': 'bg-yellow-100 text-yellow-800',
      'Принято': 'bg-green-100 text-green-800',
      'Отклонено': 'bg-red-100 text-red-800',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="text-blue-600" size={28} />
        <h1 className="text-2xl font-black text-gray-900">Модерация</h1>
      </div>

      {/* Краткая статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Новых заявок</span>
              <span className="text-2xl font-black text-orange-600">
                {stats.applications?.byStatus?.find(a => a.status === 'Новый')?.count || 0}
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">На рассмотрении</span>
              <span className="text-2xl font-black text-yellow-600">
                {stats.applications?.byStatus?.find(a => a.status === 'На рассмотрении')?.count || 0}
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Всего вакансий</span>
              <span className="text-2xl font-black text-blue-600">
                {stats.vacancies?.total || 0}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('vacancies')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'vacancies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase size={16} />
          Вакансии
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'applications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} />
          Заявки
        </button>
      </div>

      {/* ===== ВАКАНСИИ ===== */}
      {activeTab === 'vacancies' && (
        <>
          {/* Фильтры вакансий */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Поиск по названию..."
                    value={vacancySearch}
                    onChange={(e) => setVacancySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={loadVacancies}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-1"
              >
                <SlidersHorizontal size={14} /> Применить
              </button>
            </div>
          </Card>

          {/* Список вакансий */}
          <Card>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : vacancies.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Вакансии не найдены</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Название</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Город</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Зарплата</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Рекрутер</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Отклики</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacancies.map((v) => (
                      <tr key={v.VacancyId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm">{v.VacancyId}</td>
                        <td className="py-3 px-4 text-sm font-medium">{v.title}</td>
                        <td className="py-3 px-4 text-sm">{v.city || '—'}</td>
                        <td className="py-3 px-4 text-sm">{v.salary || '—'}</td>
                        <td className="py-3 px-4 text-sm">
                          {v.RecruiterProfile?.full_name || '—'}
                          <br />
                          <span className="text-xs text-gray-400">{v.Recruiter?.email || '—'}</span>
                        </td>
                        <td className="text-center py-3 px-4 text-sm">{v.ApplicationsCount || 0}</td>
                        <td className="text-center py-3 px-4">
                          <button
                            onClick={() => handleDeleteVacancy(v.VacancyId)}
                            disabled={actionLoading[v.VacancyId]}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Удалить вакансию"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Пагинация вакансий */}
          {vacancyTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={() => setVacancyPage(p => Math.max(1, p - 1))}
                disabled={vacancyPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Страница {vacancyPage} из {vacancyTotalPages} ({vacancyTotal} вакансий)
              </span>
              <button
                onClick={() => setVacancyPage(p => Math.min(vacancyTotalPages, p + 1))}
                disabled={vacancyPage === vacancyTotalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== ЗАЯВКИ ===== */}
      {activeTab === 'applications' && (
        <>
          {/* Фильтры заявок */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Статус заявки</label>
                <select
                  value={appStatus}
                  onChange={(e) => { setAppStatus(e.target.value); setAppPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">Все статусы</option>
                  <option value="Новый">Новый</option>
                  <option value="На рассмотрении">На рассмотрении</option>
                  <option value="Принято">Принято</option>
                  <option value="Отклонено">Отклонено</option>
                </select>
              </div>
              <button
                onClick={loadApplications}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-1"
              >
                <Filter size={14} /> Применить
              </button>
            </div>
          </Card>

          {/* Список заявок */}
          <Card>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Заявки не найдены</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Кандидат</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Вакансия</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Дата</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.ApplicationId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm">{app.ApplicationId}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="font-medium">{app.Candidate?.Profile?.full_name || '—'}</div>
                          <div className="text-xs text-gray-400">{app.Candidate?.email || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="font-medium">{app.Vacancy?.title || '—'}</div>
                          <div className="text-xs text-gray-400">{app.Vacancy?.RecruiterProfile?.full_name || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(app.createdAt)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <button
                            onClick={() => handleDeleteApplication(app.ApplicationId)}
                            disabled={actionLoading[app.ApplicationId]}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Удалить заявку"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Пагинация заявок */}
          {appTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={() => setAppPage(p => Math.max(1, p - 1))}
                disabled={appPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Страница {appPage} из {appTotalPages} ({appTotal} заявок)
              </span>
              <button
                onClick={() => setAppPage(p => Math.min(appTotalPages, p + 1))}
                disabled={appPage === appTotalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminModeration;