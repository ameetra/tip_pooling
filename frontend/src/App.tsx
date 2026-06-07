import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import EmployeeLayout from './components/EmployeeLayout';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import ManagerLoginPage from './pages/ManagerLoginPage';
import VerifyPage from './pages/VerifyPage';
import EmployeesPage from './pages/EmployeesPage';
import ShiftsPage from './pages/ShiftsPage';
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';
import EmployeeTipHistoryPage from './pages/EmployeeTipHistoryPage';
import UsersPage from './pages/UsersPage';

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'SHIFT_LEAD'];

function RequireAuth({ children, loginPath = '/login' }: { children: React.ReactNode; loginPath?: string }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to={loginPath} replace />;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SHIFT_LEAD') return <Navigate to="/tips/new" replace />;
  if (STAFF_ROLES.includes(user.role)) return <Navigate to="/tips" replace />;
  return <Navigate to="/my-tips" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<EmployeeLoginPage />} />
      <Route path="/manager-login" element={<ManagerLoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />

      {/* Employee-only routes */}
      <Route element={<RequireAuth loginPath="/login"><EmployeeLayout /></RequireAuth>}>
        <Route path="my-tips" element={<EmployeeTipHistoryPage />} />
      </Route>

      {/* Admin/Manager routes */}
      <Route element={<RequireAuth loginPath="/manager-login"><Layout /></RequireAuth>}>
        <Route index element={<RoleRouter />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="config" element={<SupportConfigPage />} />
        <Route path="tips" element={<TipEntriesPage />} />
        <Route path="tips/new" element={<TipEntryFormPage />} />
        <Route path="tips/:id" element={<TipEntryDetailPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  );
}
