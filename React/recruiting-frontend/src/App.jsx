import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import VacancyDetail from './pages/VacancyDetail';
import MyApplications from './pages/MyApplications';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateVacancy from './pages/CreateVacancy';

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
          <Route path="/vacancy/:id" element={<VacancyDetail />} />
          <Route 
            path="/my-applications" 
            element={
              <PrivateRoute role="Candidate">
                <MyApplications />
              </PrivateRoute>
            } 
          />
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/create-vacancy" 
            element={
              // <PrivateRoute role="Recruiter">
                <CreateVacancy />
              // </PrivateRoute>
            } 
          />
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