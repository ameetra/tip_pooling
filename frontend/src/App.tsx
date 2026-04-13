import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EmployeesPage from './pages/EmployeesPage';
import ShiftsPage from './pages/ShiftsPage';
import SupportConfigPage from './pages/SupportConfigPage';
import TipEntriesPage from './pages/TipEntriesPage';
import TipEntryFormPage from './pages/TipEntryFormPage';
import TipEntryDetailPage from './pages/TipEntryDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
