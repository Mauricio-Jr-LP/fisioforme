import { useState } from 'react';
import {
  Box, Button, Card, CardBody, SimpleGrid, Heading, Text, HStack, Icon, useDisclosure, useToast, Stack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl,
  FormLabel, Input, Textarea, NumberInput, NumberInputField, Switch, IconButton, Flex, Badge,
} from '@chakra-ui/react';
import { FiPlus, FiClock, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServiceType } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { PageHeader, Loading, EmptyState } from '../../components/ui';
import { fmtMoney } from '../../lib/format';

const COLORS = ['#0ba5a5', '#3182CE', '#38A169', '#805AD5', '#DD6B20', '#D53F8C', '#E53E3E', '#718096'];

export default function Services() {
  const qc = useQueryClient();
  const toast = useToast();
  const disc = useDisclosure();
  const [editing, setEditing] = useState<ServiceType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['service-types-all'],
    queryFn: () => api<ServiceType[]>('/service-types', { query: { all: true } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api(`/service-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-types-all'] }); toast({ status: 'info', title: 'Serviço desativado' }); },
  });

  const openNew = () => { setEditing(null); disc.onOpen(); };
  const openEdit = (s: ServiceType) => { setEditing(s); disc.onOpen(); };

  return (
    <Box>
      <PageHeader title="Serviços" subtitle="Tipos de atendimento e durações"
        action={<Button leftIcon={<FiPlus />} onClick={openNew} w={{ base: 'full', md: 'auto' }}>Novo serviço</Button>} />

      {isLoading ? <Loading /> : !data || data.length === 0 ? (
        <EmptyState icon={FiClock} title="Nenhum serviço" description="Cadastre os tipos de atendimento com seus tempos." action={<Button leftIcon={<FiPlus />} onClick={openNew}>Novo serviço</Button>} />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {data.map((s) => (
            <Card key={s.id} borderTop="4px solid" borderColor={s.color} opacity={s.active ? 1 : 0.55}>
              <CardBody>
                <Flex>
                  <Box flex="1">
                    <HStack><Heading size="sm">{s.name}</Heading>{!s.active && <Badge>Inativo</Badge>}</HStack>
                    {s.description && <Text fontSize="sm" color="gray.500" mt={1} noOfLines={2}>{s.description}</Text>}
                    <HStack mt={3} color="gray.500" fontSize="sm"><Icon as={FiClock} /><Text>{s.duration_minutes} min</Text><Text fontWeight="bold" color="brand.600" ml={2}>{fmtMoney(s.price)}</Text></HStack>
                  </Box>
                  <Stack>
                    <IconButton aria-label="Editar" size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(s)} />
                    <IconButton aria-label="Remover" size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => delMut.mutate(s.id)} />
                  </Stack>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <ServiceModal disc={disc} editing={editing} onSaved={() => qc.invalidateQueries({ queryKey: ['service-types-all'] })} />
    </Box>
  );
}

function ServiceModal({ disc, editing, onSaved }: { disc: any; editing: ServiceType | null; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  // reinicializa quando abre
  const init = editing || { name: '', description: '', duration_minutes: 50, price: '', color: COLORS[0], active: true };
  const state = { ...init, ...form };
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const body = {
        name: state.name, description: state.description || null,
        duration_minutes: Number(state.duration_minutes),
        price: state.price === '' || state.price == null ? null : Number(state.price),
        color: state.color, active: state.active,
      };
      return editing
        ? api(`/service-types/${editing.id}`, { method: 'PUT', body })
        : api('/service-types', { method: 'POST', body });
    },
    onSuccess: () => { toast({ status: 'success', title: 'Salvo' }); setForm({}); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const close = () => { setForm({}); disc.onClose(); };

  return (
    <Modal isOpen={disc.isOpen} onClose={close} size="lg">
      <ModalOverlay /><ModalContent>
        <ModalHeader>{editing ? 'Editar serviço' : 'Novo serviço'}</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <FormControl isRequired><FormLabel>Nome</FormLabel><Input value={state.name} onChange={(e) => set('name', e.target.value)} /></FormControl>
          <FormControl><FormLabel>Descrição</FormLabel><Textarea value={state.description || ''} onChange={(e) => set('description', e.target.value)} /></FormControl>
          <SimpleGrid columns={2} spacing={4}>
            <FormControl isRequired><FormLabel>Duração (min)</FormLabel><NumberInput min={5} step={5} value={state.duration_minutes} onChange={(v) => set('duration_minutes', v)}><NumberInputField /></NumberInput></FormControl>
            <FormControl><FormLabel>Preço (R$)</FormLabel><NumberInput min={0} value={state.price ?? ''} onChange={(v) => set('price', v)}><NumberInputField /></NumberInput></FormControl>
          </SimpleGrid>
          <FormControl>
            <FormLabel>Cor na agenda</FormLabel>
            <HStack>{COLORS.map((c) => (
              <Box key={c} boxSize={7} bg={c} borderRadius="md" cursor="pointer" border="3px solid" borderColor={state.color === c ? 'gray.800' : 'transparent'} onClick={() => set('color', c)} />
            ))}</HStack>
          </FormControl>
          {editing && (
            <FormControl display="flex" alignItems="center"><FormLabel mb={0}>Ativo</FormLabel><Switch isChecked={state.active} onChange={(e) => set('active', e.target.checked)} /></FormControl>
          )}
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={close}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!state.name}>Salvar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
