import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardBody, Heading, Text, Stack, HStack, Badge, Icon, SimpleGrid, Divider, Button, Alert, AlertIcon,
} from '@chakra-ui/react';
import { FiCalendar, FiActivity, FiPlus } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import type { Patient, Treatment, Appointment } from '@fisioforme/shared';
import { api, ApiError } from '../../lib/api';
import { Loading, AppointmentStatusBadge, TreatmentStatusBadge, EmptyState } from '../../components/ui';
import { fmtDate, fmtDateTime, ageFrom } from '../../lib/format';

interface PortalMe { patient: Patient; treatments: Treatment[]; appointments: (Appointment & { service_type?: any })[] }

export default function PortalHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => api<PortalMe>('/portal/me'),
    retry: false,
  });

  if (isLoading) return <Loading />;

  if (error) {
    const msg = error instanceof ApiError ? error.message : 'Erro ao carregar';
    return (
      <Box>
        <Alert status="info" borderRadius="lg" mb={4}><AlertIcon />{msg}</Alert>
        <Card><CardBody>
          <EmptyState icon={FiActivity} title="Ficha não vinculada"
            description="Sua conta ainda não está vinculada a uma ficha de paciente. Entre em contato com a clínica."
            action={<Button as={RouterLink} to="/agendar" leftIcon={<FiPlus />}>Agendar consulta</Button>} />
        </CardBody></Card>
      </Box>
    );
  }

  if (!data) return null;
  const { patient, treatments, appointments } = data;
  const upcoming = appointments.filter((a) => new Date(a.start_time) >= new Date() && a.status !== 'cancelled');

  return (
    <Stack spacing={5}>
      <Card>
        <CardBody>
          <Heading size="md">{patient.full_name}</Heading>
          <Text color="gray.500">{ageFrom(patient.birth_date)}</Text>
          <Divider my={3} />
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
            <Info label="Telefone" value={patient.phone} />
            <Info label="E-mail" value={patient.email} />
            <Info label="Queixa principal" value={patient.main_complaint} />
            <Info label="Alergias" value={patient.allergies} />
          </SimpleGrid>
        </CardBody>
      </Card>

      <Box>
        <Heading size="sm" mb={3}><Icon as={FiCalendar} mr={2} />Próximos agendamentos</Heading>
        {upcoming.length === 0 ? (
          <Card><CardBody><EmptyState icon={FiCalendar} title="Nenhum agendamento futuro"
            action={<Button as={RouterLink} to="/agendar" size="sm">Agendar</Button>} /></CardBody></Card>
        ) : (
          <Stack spacing={2}>
            {upcoming.map((a) => (
              <Card key={a.id}><CardBody py={3}>
                <HStack>
                  <Box w="4px" h="36px" borderRadius="full" bg={a.service_type?.color || 'gray.300'} />
                  <Box flex="1"><Text fontWeight="medium">{a.service_type?.name || 'Consulta'}</Text><Text fontSize="sm" color="gray.500">{fmtDateTime(a.start_time)}</Text></Box>
                  <AppointmentStatusBadge status={a.status} />
                </HStack>
              </CardBody></Card>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Heading size="sm" mb={3}><Icon as={FiActivity} mr={2} />Meus tratamentos</Heading>
        {treatments.length === 0 ? (
          <Text color="gray.400" fontSize="sm">Nenhum tratamento registrado.</Text>
        ) : (
          <Stack spacing={2}>
            {treatments.map((t) => (
              <Card key={t.id}><CardBody py={3}>
                <HStack><Text fontWeight="medium">{t.title}</Text><TreatmentStatusBadge status={t.status} /></HStack>
                {t.diagnosis && <Text fontSize="sm" color="gray.500">{t.diagnosis}</Text>}
                <Text fontSize="xs" color="gray.400">Início: {fmtDate(t.start_date)}</Text>
              </CardBody></Card>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <HStack align="start"><Text fontSize="sm" color="gray.500" minW="120px">{label}</Text><Text fontSize="sm">{value || '—'}</Text></HStack>;
}
