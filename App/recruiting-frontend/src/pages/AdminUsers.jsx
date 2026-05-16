import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchUsers,
  blockUser,
  unblockUser,
  deleteUser
} from '../api';
import { Card } from '../components/ui/Card';
import {
  Users, Search, Shield, ShieldX,
  Trash2, UserX, UserCheck, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [blockedFilter, setBlockedFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionLoading, setActionLoading] = useState({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers({ search, role: roleFilter, isBlocked: blockedFilter, page, limit: 10 });
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setTotalUsers(res.data.total);
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleAction = async (userId, action) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (action === 'block') {
        await blockUser(userId);
      } else if (action === 'unblock') {
        await unblockUser(userId);
      } else if (action === 'delete') {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
        await deleteUser(userId);
      }
      loadUsers();
    } catch (err) {
      console.error(`Ошибка при ${action}:`, err);
      alert(`Ошибка при выполнении действия: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      Admin: 'bg-purple-100 text-purple-800',
      Recruiter: 'bg-blue-100 text-blue-800',
      Candidate: 'bg-green-100 text-green-800'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[role] || 'bg-gray-100 text-gray-800'}`}>{role}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="text-blue-600" size={28} />
        <h1 className="text-2xl font-black text-gray-900">Управление пользователями</h1>
        <span className="bg-gray-100 text-gray-700 px-3 py-0.5 rounded-full text-sm font-bold">{totalUsers}</span>
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Поиск по email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Роль</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Все роли</option>
              <option value="Admin">Администратор</option>
              <option value="Recruiter">Рекрутер</option>
              <option value="Candidate">Кандидат</option>
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
            <select
              value={blockedFilter}
              onChange={(e) => { setBlockedFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Все</option>
              <option value="true">Заблокированы</option>
              <option value="false">Активны</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Найти
          </button>
        </form>
      </Card>

      {/* Таблица пользователей */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Пользователи не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Роль</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.UserId}
                    className={`border-b border-gray-50 transition-colors ${
                      user.is_blocked
                        ? 'bg-red-50/40 hover:bg-red-50/70 opacity-75'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4 text-sm">{user.UserId}</td>
                    <td className="py-3 px-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className={user.is_blocked ? 'text-gray-400 line-through' : ''}>{user.email}</span>
                        {user.is_blocked && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded">
                            Заблокирован
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3 px-4">
                      {user.is_blocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          <ShieldX size={13} /> Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          <UserCheck size={13} /> Активен
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {!user.is_blocked && user.role !== 'Admin' && (
                          <button
                            onClick={() => handleAction(user.UserId, 'block')}
                            disabled={actionLoading[user.UserId]}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Заблокировать"
                          >
                            <ShieldX size={16} />
                          </button>
                        )}
                        {user.is_blocked && (
                          <button
                            onClick={() => handleAction(user.UserId, 'unblock')}
                            disabled={actionLoading[user.UserId]}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Разблокировать"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(user.UserId, 'delete')}
                          disabled={actionLoading[user.UserId] || user.is_blocked}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-600">
            Страница {page} из {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;