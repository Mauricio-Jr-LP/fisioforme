import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Center, Spinner, VStack, Text, Progress, Box } from '@chakra-ui/react';
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
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Se passar de 2 segundos, exibe a barra de progresso (indicando cold start do Render)
    const timer = setTimeout(() => setShowProgress(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showProgress) return;
    // Barra de progresso preenche em 50 segundos (delay típico do Render)
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + (100 / 50), 99)); // não chega a 100% artificialmente
    }, 1000);
    return () => clearInterval(interval);
  }, [showProgress]);

  return (
    <Center h="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
      <VStack spacing={6}>
        <Spinner size="xl" color="brand.500" thickness="4px" />
        {showProgress && (
          <Box w="300px" textAlign="center">
            <Text fontSize="sm" color="gray.500" mb={3}>
              Acordando o servidor gratuito...<br/>Isso pode levar até 50 segundos.
            </Text>
            <Progress value={progress} size="xs" colorScheme="brand" borderRadius="full" isAnimated />
          </Box>
        )}
      </VStack>
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
