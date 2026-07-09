import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Routine from './pages/Routine';
import CalendarView from './pages/CalendarView';
import Analytics from './pages/Analytics';
import FocusRoom from './pages/FocusRoom';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user && !user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user && user.onboardingCompleted) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="routine" element={<Routine />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="focus/:taskId" element={<FocusRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
