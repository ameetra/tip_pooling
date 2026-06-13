import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import Layout from './components/Layout';
import EmployeeLayout from './components/EmployeeLayout';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import ManagerLoginPage from './pages/ManagerLoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import VerifyPage from './pages/VerifyPage';
import LandingPage from './pages/LandingPage';
import EmployeesPage from './pages/EmployeesPage';
import ShiftsPage from './pages/ShiftsPage';
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';
import EmployeeTipHistoryPage from './pages/EmployeeTipHistoryPage';
import UsersPage from './pages/UsersPage';

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'SHIFT_LEAD'];

function RequireAuth({ children, kind }: { children: React.ReactNode; kind: 'employee' | 'manager' }) {
  const { token, user } = useAuth();
  const { slug } = useTenant();
  if (!token) return <Navigate to={`/${slug}/${kind === 'employee' ? 'login' : 'manager-login'}`} replace />;
  if (user?.mustChangePassword) return <Navigate to={`/${slug}/change-password`} replace />;
  return <>{children}</>;
}

// Auth required, but allowed regardless of mustChangePassword (avoids redirect loop on the change-password page).
function RequireToken({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { slug } = useTenant();
  return token ? <>{children}</> : <Navigate to={`/${slug}/manager-login`} replace />;
}

function RoleRouter() {
  const { user } = useAuth();
  const { slug } = useTenant();
  if (!user) return <Navigate to={`/${slug}/manager-login`} replace />;
  if (user.role === 'SHIFT_LEAD') return <Navigate to={`/${slug}/tips/new`} replace />;
  if (STAFF_ROLES.includes(user.role)) return <Navigate to={`/${slug}/tips`} replace />;
  return <Navigate to={`/${slug}/my-tips`} replace />;
}

function VenueRoutes() {
  const t = useTenant();
  if (t.loading) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }
  if (t.notFound) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <Typography variant="h5">Unknown establishment</Typography>
        <Typography color="text.secondary">Check the link for your venue.</Typography>
      </Box>
    );
  }
  return (
    <Routes>
      <Route path="login" element={<EmployeeLoginPage />} />
      <Route path="manager-login" element={<ManagerLoginPage />} />
      <Route path="change-password" element={<RequireToken><ChangePasswordPage /></RequireToken>} />
      <Route path="auth/verify" element={<VerifyPage />} />

      {/* Employee-only routes */}
      <Route element={<RequireAuth kind="employee"><EmployeeLayout /></RequireAuth>}>
        <Route path="my-tips" element={<EmployeeTipHistoryPage />} />
      </Route>

      {/* Admin/Manager/Shift-lead routes */}
      <Route element={<RequireAuth kind="manager"><Layout /></RequireAuth>}>
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/:venueSlug/*" element={<TenantProvider><VenueRoutes /></TenantProvider>} />
    </Routes>
  );
}
