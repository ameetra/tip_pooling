import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import EmployeesPage from './pages/EmployeesPage';
import ShiftsPage from './pages/ShiftsPage';
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/tips" replace />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="config" element={<SupportConfigPage />} />
        <Route path="tips" element={<TipEntriesPage />} />
        <Route path="tips/new" element={<TipEntryFormPage />} />
        <Route path="tips/:id" element={<TipEntryDetailPage />} />
      </Route>
    </Routes>
  );
}
