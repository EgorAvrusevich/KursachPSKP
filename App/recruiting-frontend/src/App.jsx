import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProfilePage from './pages/Profile';
import VacancyDetail from './pages/VacancyDetail';
import MyApplications from './pages/MyApplications';
import MyVacancies from './pages/MyVacancies';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateVacancy from './pages/CreateVacancy';
import InterviewPage from './pages/InterviewRoom';
import CreateTemplate from './pages/CreateTemplate';
import MyTemplates from './pages/MyTemplates';

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
};

function AppContent() {
  return (
    <Router>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vacancy/:id" element={<VacancyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Роуты для кандидата */}
          <Route
            path="/my-applications"
            element={
              <PrivateRoute role="Candidate">
                <MyApplications />
              </PrivateRoute>
            }
          />

          {/* Роуты для рекрутера */}
          <Route
            path="/create-vacancy"
            element={
              <PrivateRoute role="Recruiter">
                <CreateVacancy />
              </PrivateRoute>
            }
          />
          <Route
            path="/templates/create"
            element={
              <PrivateRoute role="Recruiter">
                <CreateTemplate />
              </PrivateRoute>
            }
          />
          <Route
            path="/templates/my"
            element={
              <PrivateRoute role="Recruiter">
                <MyTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-vacancies"
            element={
              <PrivateRoute role="Recruiter">
                <MyVacancies />
              </PrivateRoute>
            }
          />

          {/* 2. Роут для видео-интервью */}
          {/* Мы не вешаем жесткую роль, так как там должны быть и Рекрутер, и Кандидат */}
          <Route
            path="/interview/:id"
            element={
              <PrivateRoute>
                <InterviewPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />

          {/* Редирект для несуществующих страниц */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;