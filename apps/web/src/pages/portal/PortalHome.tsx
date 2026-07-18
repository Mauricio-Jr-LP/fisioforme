import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardBody, Heading, Text, Stack, HStack, Badge, Icon, SimpleGrid, Divider, Button, Alert, AlertIcon, FormControl, FormLabel, Input, useToast, IconButton, Tooltip, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Flex
} from '@chakra-ui/react';
import { FiCalendar, FiActivity, FiPlus, FiUser, FiX } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient, Treatment, Appointment } from '@fisioforme/shared';
import { api, ApiError } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Loading, AppointmentStatusBadge, TreatmentStatusBadge, EmptyState, WhatsAppLink } from '../../components/ui';
import { fmtDate, fmtDateTime, ageFrom } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { PortalBookingModal } from './PortalBookingModal';

interface PortalMe { patient: Patient; treatments: Treatment[]; appointments: (Appointment & { service_type?: any })[] }

function CancelAppointmentModal({ appointment, disc, onSaved }: { appointment: Appointment | null, disc: any, onSaved: () => void }) {
  const toast = useToast();
  const mut = useMutation({
    mutationFn: () => api(`/portal/appointments/${appointment?.id}/cancel`, { method: 'PUT' }),
    onSuccess: () => {
      toast({ status: 'success', title: 'Agendamento cancelado' });
      disc.onClose();
      onSaved();
    },
    onError: (e: any) => toast({ status: 'error', title: 'Erro ao cancelar', description: e.message }),
  });
  if (!appointment) return null;
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size={{ base: 'full', md: 'md' }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Cancelar Agendamento</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={4}>Tem certeza que deseja cancelar seu agendamento para <strong>{fmtDateTime(appointment.start_time)}</strong>?</Text>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Lembre-se: cancelamentos só são permitidos com até 24 horas de antecedência.
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={disc.onClose}>Voltar</Button>
          <Button colorScheme="red" isLoading={mut.isPending} onClick={() => mut.mutate()}>Cancelar Agendamento</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function PortalHome() {
  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const bookingDisc = useDisclosure();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => api<PortalMe>('/portal/me'),
    retry: false,
  });

  const cancelDisc = useDisclosure();
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

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
            <Info label="Telefone" value={<WhatsAppLink phone={patient.phone} />} />
            <Info label="E-mail" value={patient.email} />
            <Info label="Queixa principal" value={patient.main_complaint} />
            <Info label="Alergias" value={patient.allergies} />
          </SimpleGrid>
        </CardBody>
      </Card>

      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="sm"><Icon as={FiCalendar} mr={2} />Próximos agendamentos</Heading>
          {upcoming.length > 0 && (
            <Button onClick={bookingDisc.onOpen} size="sm" colorScheme="brand" variant="outline">
              Nova Consulta
            </Button>
          )}
        </Flex>
        {upcoming.length === 0 ? (
          <Card><CardBody><EmptyState icon={FiCalendar} title="Nenhum agendamento futuro"
            action={<Button onClick={bookingDisc.onOpen} size="sm">Agendar</Button>} /></CardBody></Card>
        ) : (
          <Stack spacing={2}>
            {upcoming.map((a) => (
              <Card key={a.id}><CardBody py={3}>
                <HStack>
                  <Box w="4px" h="36px" borderRadius="full" bg={a.service_type?.color || 'gray.300'} />
                  <Box flex="1"><Text fontWeight="medium">{a.service_type?.name || 'Consulta'}</Text><Text fontSize="sm" color="gray.500">{fmtDateTime(a.start_time)}</Text></Box>
                  <AppointmentStatusBadge status={a.status} />
                  {['pending', 'confirmed'].includes(a.status) && (
                    <Tooltip label="Cancelar agendamento">
                      <IconButton aria-label="Cancelar" icon={<FiX />} size="sm" variant="ghost" colorScheme="red" onClick={() => { setSelectedAppt(a); cancelDisc.onOpen(); }} />
                    </Tooltip>
                  )}
                </HStack>
              </CardBody></Card>
            ))}
          </Stack>
        )}
      </Box>

      <CancelAppointmentModal appointment={selectedAppt} disc={cancelDisc} onSaved={() => qc.invalidateQueries({ queryKey: ['portal-me'] })} />

      <Box>
        <Heading size="sm" mb={3}><Icon as={FiActivity} mr={2} />Meus tratamentos</Heading>
        {treatments.length === 0 ? (
          <Text color="gray.400" fontSize="sm">Nenhum tratamento registrado.</Text>
        ) : (
          <Stack spacing={2}>
            {treatments.map((t) => (
              <Card key={t.id} as={RouterLink} to={`/portal/tratamentos/${t.id}`} _hover={{ shadow: 'md', cursor: 'pointer', transform: 'translateY(-2px)' }} transition="all 0.2s"><CardBody py={3}>
                <HStack><Text fontWeight="medium">{t.title}</Text><TreatmentStatusBadge status={t.status} /></HStack>
                {t.diagnosis && <Text fontSize="sm" color="gray.500">{t.diagnosis}</Text>}
                <Text fontSize="xs" color="gray.400">Início: {fmtDate(t.start_date)}</Text>
              </CardBody></Card>
            ))}
          </Stack>
        )}
      </Box>

      <PortalBookingModal isOpen={bookingDisc.isOpen} onClose={bookingDisc.onClose} />
    </Stack>
  );
}

function Info({ label, value }: { label: string; value?: string | ReactNode | null }) {
  return <HStack align="start"><Text fontSize="sm" color="gray.500" minW="120px">{label}</Text><Box fontSize="sm">{value || '—'}</Box></HStack>;
}
