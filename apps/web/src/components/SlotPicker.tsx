import { useState } from 'react';
import {
  Box, Stack, FormControl, FormLabel, Select, Input, SimpleGrid, Button, Text, Wrap, WrapItem,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import type { ServiceType, TimeSlot } from '@fisioforme/shared';
import { api } from '../lib/api';
import { Loading, EmptyState } from './ui';
import { FiCalendar } from 'react-icons/fi';
import { dayjs } from '../lib/format';

interface Props {
  onSelect: (slot: TimeSlot, serviceTypeId: string) => void;
  selectedStart?: string;
  publicMode?: boolean; // usa endpoints sem auth
}

export function SlotPicker({ onSelect, selectedStart, publicMode }: Props) {
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: services } = useQuery({
    queryKey: ['services', publicMode],
    queryFn: () => api<ServiceType[]>('/service-types', { auth: !publicMode }),
  });

  const { data: slots, isFetching } = useQuery({
    queryKey: ['slots', date, serviceId],
    queryFn: () => api<TimeSlot[]>('/availability/slots', {
      auth: !publicMode,
      query: { date, service_type_id: serviceId },
    }),
    enabled: !!serviceId && !!date,
  });

  return (
    <Stack spacing={4}>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel>Serviço</FormLabel>
          <Select placeholder="Selecione..." value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services?.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Data</FormLabel>
          <Input type="date" value={date} min={dayjs().format('YYYY-MM-DD')} onChange={(e) => setDate(e.target.value)} />
        </FormControl>
      </SimpleGrid>

      <Box>
        <FormLabel>Horários disponíveis</FormLabel>
        {!serviceId ? (
          <Text color="gray.400" fontSize="sm">Selecione um serviço para ver os horários.</Text>
        ) : isFetching ? (
          <Loading />
        ) : !slots || slots.length === 0 ? (
          <EmptyState icon={FiCalendar} title="Sem horários" description="Nenhum horário livre nesta data. Tente outro dia." />
        ) : (
          <Wrap spacing={2}>
            {slots.map((s) => (
              <WrapItem key={s.start}>
                <Button
                  size="sm"
                  variant={selectedStart === s.start ? 'solid' : 'outline'}
                  onClick={() => onSelect(s, serviceId)}
                >
                  {s.label}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Box>
    </Stack>
  );
}
