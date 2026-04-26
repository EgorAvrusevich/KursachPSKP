import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, User, LogOut, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-primary tracking-tighter italic">HireVich</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-primary">Поиск работы</Link>
            {user?.role === 'Candidate' && <Link to="/my-applications" className="hover:text-primary">Мои отклики</Link>}
            {user?.role === 'Recruiter' && <Link to="/create-vacancy" className="flex items-center gap-1 text-accent font-bold"><PlusCircle size={18}/> Создать вакансию</Link>}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-primary font-bold">
                    {user.role[0]}
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase">{user.role}</span>
                </div>
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition">
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