import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import EmployeeLayout from './components/EmployeeLayout';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import EmployeesPage from './pages/EmployeesPage';
import ShiftsPage from './pages/ShiftsPage';
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';
import EmployeeTipHistoryPage from './pages/EmployeeTipHistoryPage';

const MANAGEMENT_ROLES = ['ADMIN', 'MANAGER'];

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return MANAGEMENT_ROLES.includes(user.role)
    ? <Navigate to="/tips" replace />
    : <Navigate to="/my-tips" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />

      {/* Employee-only routes */}
      <Route element={<RequireAuth><EmployeeLayout /></RequireAuth>}>
        <Route path="my-tips" element={<EmployeeTipHistoryPage />} />
      </Route>

      {/* Admin/Manager routes */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<RoleRouter />} />
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
