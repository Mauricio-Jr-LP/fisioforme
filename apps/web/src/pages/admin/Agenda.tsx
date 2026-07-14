import { useState } from 'react';
import {
  Box, Button, Card, CardBody, HStack, Text, Icon, IconButton, Stack, useDisclosure, useToast, Badge, Flex,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl,
  FormLabel, Select, Input, Menu, MenuButton, MenuList, MenuItem, Divider, Spacer,
} from '@chakra-ui/react';
import { FiPlus, FiChevronLeft, FiChevronRight, FiMoreVertical, FiUser, FiPhone } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Appointment, Patient, TimeSlot, AppointmentStatus } from '@fisioforme/shared';
import { APPOINTMENT_STATUS_LABELS } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { SlotPicker } from '../../components/SlotPicker';
import { PageHeader, Loading, AppointmentStatusBadge, EmptyState } from '../../components/ui';
import { fmtTime, dayjs } from '../../lib/format';

export default function Agenda() {
  const [day, setDay] = useState(dayjs().format('YYYY-MM-DD'));
  const qc = useQueryClient();
  const toast = useToast();
  const newDisc = useDisclosure();

  const from = dayjs(day).startOf('day').toISOString();
  const to = dayjs(day).endOf('day').toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', day],
    queryFn: () => api<Appointment[]>('/appointments', { query: { from, to } }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast({ status: 'success', title: 'Atualizado' }); },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast({ status: 'info', title: 'Removido' }); },
  });

  const shift = (n: number) => setDay(dayjs(day).add(n, 'day').format('YYYY-MM-DD'));

  return (
    <Box>
      <PageHeader title="Agenda" subtitle="Gerencie os agendamentos"
        action={<Button leftIcon={<FiPlus />} onClick={newDisc.onOpen} w={{ base: 'full', md: 'auto' }}>Novo agendamento</Button>} />

      <Card mb={4}>
        <CardBody py={3}>
          <HStack>
            <IconButton aria-label="Anterior" icon={<FiChevronLeft />} onClick={() => shift(-1)} variant="ghost" />
            <Box textAlign="center" flex="1">
              <Text fontWeight="semibold">{dayjs(day).format('dddd, DD [de] MMMM')}</Text>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} size="sm" variant="unstyled" textAlign="center" maxW="160px" mx="auto" />
            </Box>
            <IconButton aria-label="Próximo" icon={<FiChevronRight />} onClick={() => shift(1)} variant="ghost" />
          </HStack>
          <HStack justify="center" mt={2}>
            <Button size="xs" variant="ghost" onClick={() => setDay(dayjs().format('YYYY-MM-DD'))}>Hoje</Button>
          </HStack>
        </CardBody>
      </Card>

      {isLoading ? <Loading /> : !data || data.length === 0 ? (
        <EmptyState icon={FiPlus} title="Nenhum agendamento" description="Não há atendimentos neste dia." action={<Button leftIcon={<FiPlus />} onClick={newDisc.onOpen}>Novo agendamento</Button>} />
      ) : (
        <Stack spacing={3}>
          {data.map((a) => (
            <Card key={a.id} borderLeft="4px solid" borderColor={a.service_type?.color || 'gray.300'}>
              <CardBody>
                <Flex gap={3} align="center">
                  <Box textAlign="center" minW="56px">
                    <Text fontWeight="bold" fontSize="lg">{fmtTime(a.start_time)}</Text>
                    <Text fontSize="xs" color="gray.400">{fmtTime(a.end_time)}</Text>
                  </Box>
                  <Divider orientation="vertical" h="40px" />
                  <Box flex="1" minW={0}>
                    <HStack>
                      <Text fontWeight="semibold" noOfLines={1}>
                        {a.patient?.full_name || a.guest_name || 'Sem paciente'}
                      </Text>
                      {a.is_public_booking && <Badge colorScheme="purple">Online</Badge>}
                    </HStack>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>{a.service_type?.name || 'Serviço'}</Text>
                    {(a.guest_phone || a.patient?.phone) && (
                      <HStack fontSize="xs" color="gray.400" mt={1}><Icon as={FiPhone} /><Text>{a.guest_phone || a.patient?.phone}</Text></HStack>
                    )}
                  </Box>
                  <AppointmentStatusBadge status={a.status} />
                  <Menu>
                    <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" aria-label="Ações" />
                    <MenuList>
                      {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                        <MenuItem key={s} onClick={() => statusMut.mutate({ id: a.id, status: s })}>
                          Marcar como {APPOINTMENT_STATUS_LABELS[s]}
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem color="red.500" onClick={() => delMut.mutate(a.id)}>Excluir</MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </Stack>
      )}

      <NewAppointmentModal disc={newDisc} onSaved={() => qc.invalidateQueries({ queryKey: ['appointments'] })} />
    </Box>
  );
}

function NewAppointmentModal({ disc, onSaved }: { disc: any; onSaved: () => void }) {
  const toast = useToast();
  const [patientId, setPatientId] = useState('');
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: patients } = useQuery({
    queryKey: ['patients-min'],
    queryFn: () => api<Patient[]>('/patients'),
    enabled: disc.isOpen,
  });

  const mut = useMutation({
    mutationFn: () => api('/appointments', {
      method: 'POST',
      body: { patient_id: patientId || null, service_type_id: serviceId, start_time: slot!.start, notes: notes || null, status: 'confirmed' },
    }),
    onSuccess: () => { toast({ status: 'success', title: 'Agendado' }); reset(); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const reset = () => { setPatientId(''); setSlot(null); setServiceId(''); setNotes(''); };

  return (
    <Modal isOpen={disc.isOpen} onClose={() => { reset(); disc.onClose(); }} size="xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent>
        <ModalHeader>Novo agendamento</ModalHeader><ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>Paciente</FormLabel>
              <Select placeholder="Sem paciente (avulso)" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                {patients?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </FormControl>
            <Divider />
            <SlotPicker selectedStart={slot?.start} onSelect={(s, svc) => { setSlot(s); setServiceId(svc); }} />
            <FormControl><FormLabel>Observações</FormLabel><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={() => { reset(); disc.onClose(); }}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!slot || !serviceId}>Agendar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
