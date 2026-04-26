import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Briefcase, PlusCircle, LogOut, MessageSquare, 
  Heart, User, Settings, Users, Video 
} from 'lucide-react';
import Button from '../ui/Button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Логотип (Доступен всем) */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-blue-600 tracking-tighter italic">
              HireVich
            </span>
          </Link>

          {/* Центральное меню (Зависит от роли) */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Поиск вакансий</Link>

            {user?.role === 'Candidate' && (
              <>
                <Link to="/my-applications" className="hover:text-blue-600">Мои отклики</Link>
                <Link to="/favorites" className="flex items-center gap-1 hover:text-blue-600">
                  <Heart size={16} /> Избранное
                </Link>
                <Link to="/messages" className="flex items-center gap-1 hover:text-blue-600">
                  <MessageSquare size={16} /> Сообщения
                </Link>
              </>
            )}

            {user?.role === 'Recruiter' && (
              <>
                <Link to="/vacancies/my-vacancies" className="hover:text-blue-600">Мои вакансии</Link>
                <Link to="/candidates-base" className="hover:text-blue-600">База соискателей</Link>
                <Link to="/messages" className="flex items-center gap-1 hover:text-blue-600">
                  <MessageSquare size={16} /> Чат
                </Link>
                <Link to="/create-vacancy" className="flex items-center gap-1 text-orange-500 font-bold hover:text-orange-600">
                  <PlusCircle size={18}/> Создать
                </Link>
              </>
            )}

            {user?.role === 'Admin' && (
              <>
                <Link to="/admin/users" className="flex items-center gap-1 hover:text-blue-600">
                  <Users size={16} /> Пользователи
                </Link>
                <Link to="/admin/moderation" className="flex items-center gap-1 hover:text-blue-600">
                  <Settings size={16} /> Модерация
                </Link>
              </>
            )}
          </div>

          {/* Правая часть: Профиль и Выход */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                {/* Ссылка на профиль/резюме (общая для всех ролей) */}
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    <User size={18} />
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[10px] leading-none font-bold text-gray-400 uppercase">
                      {user.role}
                    </span>
                    <span className="text-xs font-bold text-gray-700">Профиль</span>
                  </div>
                </Link>
                
                <button 
                  onClick={logout} 
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Выйти"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/login')}>Войти</Button>
                <Button variant="primary" onClick={() => navigate('/register')}>Регистрация</Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;