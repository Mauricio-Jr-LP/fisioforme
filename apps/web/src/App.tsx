import { Routes, Route, Navigate } from 'react-router-dom';
import { Center, Spinner } from '@chakra-ui/react';
import { useAuth } from './context/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { PortalLayout } from './components/PortalLayout';

import Landing from './pages/public/Landing';
import PublicBooking from './pages/public/PublicBooking';
import Login from './pages/Login';

import Dashboard from './pages/admin/Dashboard';
import Patients from './pages/admin/Patients';
import PatientDetail from './pages/admin/PatientDetail';
import TreatmentDetail from './pages/admin/TreatmentDetail';
import Agenda from './pages/admin/Agenda';
import Services from './pages/admin/Services';
import Availability from './pages/admin/Availability';
import SettingsPage from './pages/admin/SettingsPage';

import PortalHome from './pages/portal/PortalHome';
import PortalConsultations from './pages/portal/PortalConsultations';

function FullscreenSpinner() {
  return (
    <Center h="100vh">
      <Spinner size="xl" color="brand.500" thickness="4px" />
    </Center>
  );
}

function RequireStaff({ children }: { children: JSX.Element }) {
  const { loading, session, isStaff } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/portal" replace />;
  return children;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, session } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Landing />} />
      <Route path="/agendar" element={<PublicBooking />} />
      <Route path="/login" element={<Login />} />

      {/* Área administrativa (staff) */}
      <Route
        path="/app"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pacientes" element={<Patients />} />
        <Route path="pacientes/:id" element={<PatientDetail />} />
        <Route path="tratamentos/:id" element={<TreatmentDetail />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="servicos" element={<Services />} />
        <Route path="disponibilidade" element={<Availability />} />
        <Route path="config" element={<SettingsPage />} />
      </Route>

      {/* Portal do paciente */}
      <Route
        path="/portal"
        element={
          <RequireAuth>
            <PortalLayout />
          </RequireAuth>
        }
      >
        <Route index element={<PortalHome />} />
        <Route path="consultas" element={<PortalConsultations />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
