import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { fetchDashboard } from '../api';
import {
  Users, Briefcase, FileText, AlertTriangle,
  UserPlus, CheckCircle, XCircle, Shield
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <Card className="relative overflow-hidden">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('/90', '/10')}`}>
        <Icon size={28} />
      </div>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchDashboard();
        setStats(res.data);
      } catch (err) {
        console.error("Ошибка загрузки статистики:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roleColors = {
    Admin: 'text-purple-600',
    Recruiter: 'text-blue-600',
    Candidate: 'text-green-600'
  };

  const appColors = {
    'Новый': 'text-orange-600',
    'На рассмотрении': 'text-yellow-600',
    'Принято': 'text-green-600',
    'Отклонено': 'text-red-600'
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="text-blue-600" size={28} />
        <h1 className="text-2xl font-black text-gray-900">Панель администратора</h1>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Всего пользователей"
          value={stats?.users?.total || 0}
          subtext={`Заблокировано: ${stats?.users?.blocked || 0}`}
          color="text-blue-600"
        />
        <StatCard
          icon={Briefcase}
          label="Вакансии"
          value={stats?.vacancies?.total || 0}
          subtext="Всего вакансий"
          color="text-green-600"
        />
        <StatCard
          icon={FileText}
          label="Заявки"
          value={stats?.applications?.byStatus?.reduce((acc, s) => acc + s.count, 0) || 0}
          subtext="Всего подано"
          color="text-orange-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Новые заявки"
          value={
            stats?.applications?.byStatus?.find(a => a.status === 'Новый')?.count || 0
          }
          subtext="Ещё не рассмотрены"
          color="text-orange-600"
        />
      </div>

      {/* Пользователи по ролям */}
      <Card>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Пользователи по ролям</h2>
        <div className="space-y-3">
          {stats?.users?.byRole?.map((r) => (
            <div key={r.role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleColors[r.role] || 'text-gray-600'} bg-opacity-10`}>
                  {r.role === 'Admin' && <Shield size={18} />}
                  {r.role === 'Recruiter' && <UserPlus size={18} />}
                  {r.role === 'Candidate' && <Users size={18} />}
                </div>
                <span className="font-medium">{r.role}</span>
              </div>
              <span className="text-2xl font-black">{r.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Заявки по статусам */}
      <Card>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Заявки по статусам</h2>
        <div className="space-y-3">
          {stats?.applications?.byStatus?.map((s) => (
            <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{s.status}</span>
              <span className={`text-2xl font-black ${appColors[s.status] || 'text-gray-600'}`}>{s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Вакансии */}
      <Card>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Вакансии</h2>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Всего вакансий</span>
          <span className="text-2xl font-black text-blue-600">{stats?.vacancies?.total || 0}</span>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;