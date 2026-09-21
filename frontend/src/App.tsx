import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';
import EmployeeTipHistoryPage from './pages/EmployeeTipHistoryPage';
import UsersPage from './pages/UsersPage';
import PayrollReportPage from './pages/PayrollReportPage';
import { isManagement, isStaff } from './constants/roles';

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

// Each kind of login has one home page.
const homePath = (role: string) => (role === 'SHIFT_LEAD' ? 'tips/new' : isStaff(role) ? 'tips' : 'my-tips');

// Renders the page only for roles that pass `allow`; everyone else is sent to their own home page.
function RequireRole({ allow, children }: { allow: (role: string) => boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  const { slug } = useTenant();
  if (!user) return <Navigate to={`/${slug}/manager-login`} replace />;
  return allow(user.role) ? <>{children}</> : <Navigate to={`/${slug}/${homePath(user.role)}`} replace />;
}

function RoleRouter() {
  const { user } = useAuth();
  const { slug } = useTenant();
  return <Navigate to={user ? `/${slug}/${homePath(user.role)}` : `/${slug}/manager-login`} replace />;
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

      {/* Employee-only routes: anyone who isn't staff */}
      <Route element={<RequireAuth kind="employee"><RequireRole allow={(role) => !isStaff(role)}><EmployeeLayout /></RequireRole></RequireAuth>}>
        <Route path="my-tips" element={<EmployeeTipHistoryPage />} />
      </Route>

      {/* Staff routes: admin, manager, shift lead */}
      <Route element={<RequireAuth kind="manager"><RequireRole allow={isStaff}><Layout /></RequireRole></RequireAuth>}>
        <Route index element={<RoleRouter />} />
        <Route path="tips/new" element={<TipEntryFormPage />} />

        {/* Admin and manager only (shift leads and employees are sent to their home page) */}
        <Route element={<RequireRole allow={isManagement}><Outlet /></RequireRole>}>
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="config" element={<SupportConfigPage />} />
          <Route path="tips" element={<TipEntriesPage />} />
          <Route path="tips/:id" element={<TipEntryDetailPage />} />
          <Route path="payroll" element={<PayrollReportPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
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
