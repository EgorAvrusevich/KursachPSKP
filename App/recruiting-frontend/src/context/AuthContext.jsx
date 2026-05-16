import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (token && role) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.is_blocked) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    setUser(null);
                    setLoading(false);
                    return;
                }
            } catch { /* ignore */ }

            setUser((prev) => {
                if (prev?.token !== token || prev?.role !== role) {
                    return { token, role };
                }
                return prev;
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        // 1. Проверка при первой загрузке
        checkAuth();

        // 2. СЛУШАТЕЛЬ СОБЫТИЙ: Обновляет состояние, если localStorage 
        // изменился в другой вкладке браузера
        const handleStorageChange = (e) => {
            if (e.key === 'token' || e.key === 'role') {
                checkAuth();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = (userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', userData.role);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, checkAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);