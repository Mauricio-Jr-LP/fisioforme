import { Link as RouterLink } from 'react-router-dom';
import {
  SimpleGrid, Card, CardBody, CardHeader, Heading, Stack, HStack, Box, Text, Badge, Icon, Divider, Button, Flex,
} from '@chakra-ui/react';
import { FiUsers, FiCalendar, FiActivity, FiClock, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { PageHeader, StatCard, Loading, AppointmentStatusBadge, EmptyState } from '../../components/ui';
import { fmtDateTime, fmtTime } from '../../lib/format';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardStats>('/dashboard'),
  });

  if (isLoading || !data) return <Loading />;

  return (
    <Box>
      <PageHeader title="Painel" subtitle="Visão geral da clínica hoje" />

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <StatCard label="Pacientes ativos" value={data.patients_total} icon={FiUsers} />
        <StatCard label="Consultas hoje" value={data.appointments_today} icon={FiCalendar} color="blue.500" />
        <StatCard label="Próx. 7 dias" value={data.appointments_week} icon={FiClock} color="purple.500" />
        <StatCard label="Tratamentos ativos" value={data.active_treatments} icon={FiActivity} color="green.500" />
      </SimpleGrid>

      {data.pending_appointments > 0 && (
        <Card mb={6} bg="yellow.50" borderLeft="4px solid" borderColor="yellow.400">
          <CardBody>
            <HStack>
              <Icon as={FiAlertCircle} color="yellow.500" boxSize={5} />
              <Text><b>{data.pending_appointments}</b> solicitação(ões) de agendamento aguardando confirmação.</Text>
              <Button as={RouterLink} to="/app/agenda" size="sm" ml="auto" variant="outline">Ver agenda</Button>
            </HStack>
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader pb={2}><Heading size="md">Próximos atendimentos</Heading></CardHeader>
          <CardBody pt={2}>
            {data.upcoming.length === 0 ? (
              <EmptyState icon={FiCalendar} title="Nada agendado" description="Não há próximos atendimentos." />
            ) : (
              <Stack divider={<Divider />} spacing={3}>
                {data.upcoming.map((a) => (
                  <HStack key={a.id} spacing={3}>
                    <Box w="4px" h="40px" borderRadius="full" bg={a.service_type?.color || 'gray.300'} />
                    <Box flex="1" minW={0}>
                      <Text fontWeight="medium" noOfLines={1}>
                        {a.patient?.full_name || a.guest_name || 'Sem paciente'}
                      </Text>
                      <Text fontSize="sm" color="gray.500" noOfLines={1}>
                        {a.service_type?.name || 'Serviço'} · {fmtDateTime(a.start_time)}
                      </Text>
                    </Box>
                    <AppointmentStatusBadge status={a.status} />
                  </HStack>
                ))}
              </Stack>
            )}
            <Button as={RouterLink} to="/app/agenda" mt={4} size="sm" variant="ghost" rightIcon={<FiArrowRight />}>
              Ver agenda completa
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={2}><Heading size="md">Próximos horários livres</Heading></CardHeader>
          <CardBody pt={2}>
            {data.next_available.length === 0 ? (
              <EmptyState icon={FiClock} title="Sem vagas próximas" description="Verifique sua disponibilidade." />
            ) : (
              <Flex wrap="wrap" gap={2}>
                {data.next_available.map((s) => (
                  <Badge key={s.start} colorScheme="green" px={3} py={2} borderRadius="lg" fontSize="sm">
                    {s.label}
                  </Badge>
                ))}
              </Flex>
            )}
            <Text fontSize="xs" color="gray.400" mt={4}>Baseado em sessões de 60 min.</Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
