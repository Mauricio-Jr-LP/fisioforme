import { useState } from 'react';
import {
  Box, Button, Card, CardBody, Heading, Text, HStack, VStack, Icon, useToast, Stack, SimpleGrid, Select,
  Input, IconButton, Divider, Switch, FormControl, FormLabel, Badge, Flex,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiClock, FiCalendar } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AvailabilityRule, AvailabilityException } from '@fisioforme/shared';
import { WEEKDAY_LABELS } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { PageHeader, Loading } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export default function Availability() {
  return (
    <Box>
      <PageHeader title="Disponibilidade" subtitle="Defina os dias, horários e bloqueios de atendimento" />
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <WeeklyRules />
        <Exceptions />
      </SimpleGrid>
    </Box>
  );
}

function WeeklyRules() {
  const qc = useQueryClient();
  const toast = useToast();
  const [weekday, setWeekday] = useState('1');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('12:00');

  const { data, isLoading } = useQuery({
    queryKey: ['avail-rules'],
    queryFn: () => api<AvailabilityRule[]>('/availability/rules'),
  });

  const addMut = useMutation({
    mutationFn: () => api('/availability/rules', { method: 'POST', body: { weekday: Number(weekday), start_time: start, end_time: end } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['avail-rules'] }); toast({ status: 'success', title: 'Horário adicionado' }); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api(`/availability/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avail-rules'] }),
  });

  const byDay = (d: number) => (data || []).filter((r) => r.weekday === d);

  return (
    <Card>
      <CardBody>
        <Heading size="sm" mb={1}><Icon as={FiClock} mr={2} />Horários semanais</Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>Janelas recorrentes de atendimento por dia da semana.</Text>

        <Card variant="outline" mb={4}><CardBody>
          <Stack spacing={3}>
            <FormControl><FormLabel fontSize="sm">Dia</FormLabel>
              <Select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                {WEEKDAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </Select>
            </FormControl>
            <HStack>
              <FormControl><FormLabel fontSize="sm">Início</FormLabel><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Fim</FormLabel><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></FormControl>
            </HStack>
            <Button leftIcon={<FiPlus />} onClick={() => addMut.mutate()} isLoading={addMut.isPending}>Adicionar</Button>
          </Stack>
        </CardBody></Card>

        {isLoading ? <Loading /> : (
          <Stack spacing={3} divider={<Divider />}>
            {WEEKDAY_LABELS.map((label, d) => (
              <Box key={d}>
                <Text fontWeight="semibold" fontSize="sm" mb={1}>{label}</Text>
                {byDay(d).length === 0 ? <Text fontSize="sm" color="gray.400">Fechado</Text> : (
                  <Flex wrap="wrap" gap={2}>
                    {byDay(d).map((r) => (
                      <Badge key={r.id} colorScheme="brand" px={2} py={1} borderRadius="md" display="flex" alignItems="center" gap={1}>
                        {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                        <Icon as={FiTrash2} cursor="pointer" onClick={() => delMut.mutate(r.id)} />
                      </Badge>
                    ))}
                  </Flex>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}

function Exceptions() {
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['avail-exc'],
    queryFn: () => api<AvailabilityException[]>('/availability/exceptions'),
  });

  const addMut = useMutation({
    mutationFn: () => api('/availability/exceptions', {
      method: 'POST',
      body: { date, is_available: isAvailable, start_time: start || null, end_time: end || null, reason: reason || null },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['avail-exc'] }); toast({ status: 'success', title: 'Exceção adicionada' }); setDate(''); setReason(''); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api(`/availability/exceptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avail-exc'] }),
  });

  return (
    <Card>
      <CardBody>
        <Heading size="sm" mb={1}><Icon as={FiCalendar} mr={2} />Exceções e bloqueios</Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>Feriados, folgas ou horários extras em datas específicas.</Text>

        <Card variant="outline" mb={4}><CardBody><Stack spacing={3}>
          <FormControl isRequired><FormLabel fontSize="sm">Data</FormLabel><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0} fontSize="sm">{isAvailable ? 'Disponibilidade extra' : 'Bloqueio (indisponível)'}</FormLabel>
            <Switch ml="auto" isChecked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          </FormControl>
          <HStack>
            <FormControl><FormLabel fontSize="sm">Início (opcional)</FormLabel><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></FormControl>
            <FormControl><FormLabel fontSize="sm">Fim (opcional)</FormLabel><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></FormControl>
          </HStack>
          <Text fontSize="xs" color="gray.400">Sem horários = dia inteiro.</Text>
          <FormControl><FormLabel fontSize="sm">Motivo</FormLabel><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Feriado" /></FormControl>
          <Button leftIcon={<FiPlus />} onClick={() => addMut.mutate()} isLoading={addMut.isPending} isDisabled={!date}>Adicionar</Button>
        </Stack></CardBody></Card>

        {isLoading ? <Loading /> : (data || []).length === 0 ? (
          <Text fontSize="sm" color="gray.400">Nenhuma exceção cadastrada.</Text>
        ) : (
          <Stack spacing={2} divider={<Divider />}>
            {data!.map((e) => (
              <HStack key={e.id}>
                <Badge colorScheme={e.is_available ? 'green' : 'red'}>{e.is_available ? 'Extra' : 'Bloqueio'}</Badge>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium">{fmtDate(e.date)} {e.start_time ? `· ${e.start_time.slice(0, 5)}–${e.end_time?.slice(0, 5)}` : '· dia inteiro'}</Text>
                  {e.reason && <Text fontSize="xs" color="gray.500">{e.reason}</Text>}
                </Box>
                <IconButton aria-label="Remover" size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => delMut.mutate(e.id)} />
              </HStack>
            ))}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}
