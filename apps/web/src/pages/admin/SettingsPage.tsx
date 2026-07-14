import { useEffect, useState } from 'react';
import {
  Box, Card, CardBody, Heading, Stack, FormControl, FormLabel, Input, Button, useToast, SimpleGrid,
  NumberInput, NumberInputField, Text, Divider, Table, Thead, Tbody, Tr, Th, Td, Badge,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, Loading } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<any>({ name: '', phone: '', address: '', slot_granularity_minutes: 30 });

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api<any>('/settings', { auth: false }) });
  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => api<any[]>('/settings/staff') });

  useEffect(() => { if (data) setForm({ slot_granularity_minutes: 30, ...data }); }, [data]);

  const mut = useMutation({
    mutationFn: () => api('/settings', { method: 'PUT', body: { ...form, slot_granularity_minutes: Number(form.slot_granularity_minutes) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ status: 'success', title: 'Configurações salvas' }); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader title="Configurações" subtitle="Dados da clínica e agenda" />
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Dados da clínica</Heading>
            <Stack spacing={4}>
              <FormControl><FormLabel>Nome</FormLabel><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Telefone</FormLabel><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Endereço</FormLabel><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></FormControl>
              <FormControl>
                <FormLabel>Granularidade dos horários (min)</FormLabel>
                <NumberInput min={5} step={5} value={form.slot_granularity_minutes} onChange={(v) => set('slot_granularity_minutes', v)}><NumberInputField /></NumberInput>
                <Text fontSize="xs" color="gray.400" mt={1}>Intervalo entre horários oferecidos (ex.: 30 min).</Text>
              </FormControl>
              <Button onClick={() => mut.mutate()} isLoading={mut.isPending}>Salvar</Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Equipe</Heading>
            <Table size="sm">
              <Thead><Tr><Th>Nome</Th><Th>Papel</Th></Tr></Thead>
              <Tbody>
                {(staff || []).map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.full_name || s.email}{s.id === profile?.id && <Badge ml={2} colorScheme="brand">você</Badge>}</Td>
                    <Td><Badge colorScheme={s.role === 'admin' ? 'purple' : 'blue'}>{s.role}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Divider my={4} />
            <Text fontSize="sm" color="gray.500">
              Para promover um usuário a fisioterapeuta/admin, atualize o campo <b>role</b> em <b>profiles</b> no
              Supabase (ou via SQL). Novos cadastros entram como <b>patient</b>.
            </Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
