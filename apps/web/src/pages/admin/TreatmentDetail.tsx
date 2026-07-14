import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, Heading, HStack, VStack, Text, Icon, Link, Progress, Badge, Stack,
  Select, useToast, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, FormControl, FormLabel, Input, Textarea, NumberInput, NumberInputField, SimpleGrid,
  IconButton, Divider, Flex,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiEdit2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Treatment, TreatmentStage, Consultation, StageStatus, TreatmentStatus } from '@fisioforme/shared';
import { STAGE_STATUS_LABELS } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { Loading, TreatmentStatusBadge, StageStatusBadge, EmptyState } from '../../components/ui';
import { fmtDate } from '../../lib/format';

type FullTreatment = Treatment & { stages: TreatmentStage[]; consultations: Consultation[] };

export default function TreatmentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const stageDisc = useDisclosure();

  const { data, isLoading } = useQuery({
    queryKey: ['treatment', id],
    queryFn: () => api<FullTreatment>(`/treatments/${id}`),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['treatment', id] });

  const statusMut = useMutation({
    mutationFn: (status: TreatmentStatus) => api(`/treatments/${id}`, { method: 'PUT', body: { status } }),
    onSuccess: () => { invalidate(); toast({ status: 'success', title: 'Status atualizado' }); },
  });

  const stageStatusMut = useMutation({
    mutationFn: ({ stageId, status }: { stageId: string; status: StageStatus }) =>
      api(`/treatments/${id}/stages/${stageId}`, { method: 'PUT', body: { status } }),
    onSuccess: invalidate,
  });

  const delStageMut = useMutation({
    mutationFn: (stageId: string) => api(`/treatments/${id}/stages/${stageId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  if (isLoading || !data) return <Loading />;

  return (
    <Box>
      <Link as={RouterLink} to={`/app/pacientes/${data.patient_id}`} color="gray.500" mb={3} display="inline-flex" alignItems="center">
        <Icon as={FiArrowLeft} mr={1} /> Voltar ao paciente
      </Link>

      <Card mb={4}>
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ md: 'center' }}>
            <Box>
              <HStack><Heading size="md">{data.title}</Heading><TreatmentStatusBadge status={data.status} /></HStack>
              {data.treatment_type && <Badge colorScheme="purple" mt={2}>{data.treatment_type}</Badge>}
              {data.diagnosis && <Text color="gray.500" mt={2}>{data.diagnosis}</Text>}
              {data.description && <Text fontSize="sm" color="gray.600" mt={2}>{data.description}</Text>}
              <Text fontSize="xs" color="gray.400" mt={2}>Início: {fmtDate(data.start_date)} · Paciente: {data.patient?.full_name}</Text>
            </Box>
            <Select ml={{ md: 'auto' }} w={{ base: 'full', md: '200px' }} value={data.status}
              onChange={(e) => statusMut.mutate(e.target.value as TreatmentStatus)}>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </Flex>
        </CardBody>
      </Card>

      {/* Controle Financeiro */}
      <Card mb={4} borderLeft="4px solid" borderColor="green.400">
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={6} align={{ md: 'center' }} justify="space-between">
            <Box flex="1">
              <Heading size="sm" mb={2}>Controle Financeiro do Pacote</Heading>
              <HStack spacing={8} mt={3}>
                <Box>
                  <Text fontSize="xs" color="gray.500">Valor Total</Text>
                  <Text fontWeight="bold" fontSize="lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price || 0)}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Valor Pago</Text>
                  <Text fontWeight="bold" fontSize="lg" color="green.600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.amount_paid || 0)}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Restante</Text>
                  <Text fontWeight="bold" fontSize="lg" color="red.500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, (data.price || 0) - (data.amount_paid || 0)))}</Text>
                </Box>
              </HStack>
              <Box mt={4} maxW="400px">
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">Progresso de pagamento</Text>
                  <Text fontSize="xs" color="gray.500">{data.price > 0 ? Math.min(100, Math.round(((data.amount_paid || 0) / data.price) * 100)) : 0}%</Text>
                </HStack>
                <Progress value={data.price > 0 ? ((data.amount_paid || 0) / data.price) * 100 : 0} size="sm" colorScheme="green" borderRadius="full" />
              </Box>
            </Box>
            <Box>
              <Button leftIcon={<FiEdit2 />} colorScheme="green" variant="outline" size="sm" onClick={() => {
                const add = prompt('Digite o valor pago adicional para registrar (ex: 150.00):');
                if (add && !isNaN(parseFloat(add))) {
                  const newTotal = (data.amount_paid || 0) + parseFloat(add);
                  api(`/treatments/${data.id}`, { method: 'PUT', body: { amount_paid: newTotal } }).then(() => invalidate());
                }
              }}>
                Registrar Pagamento
              </Button>
            </Box>
          </Flex>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <HStack mb={4}>
            <Heading size="sm">Etapas do tratamento</Heading>
            <Button size="sm" ml="auto" leftIcon={<FiPlus />} onClick={stageDisc.onOpen}>Nova etapa</Button>
          </HStack>

          {data.stages.length === 0 ? (
            <EmptyState icon={FiCheck} title="Sem etapas" description="Divida o tratamento em etapas com metas de sessões." />
          ) : (
            <Stack spacing={3}>
              {data.stages.map((s, i) => {
                const pct = s.target_sessions > 0 ? Math.min(100, Math.round((s.completed_sessions / s.target_sessions) * 100)) : 0;
                return (
                  <Card key={s.id} variant="outline">
                    <CardBody>
                      <Flex gap={3} align="start">
                        <Flex boxSize={8} bg="brand.50" color="brand.600" borderRadius="full" align="center" justify="center" fontWeight="bold" fontSize="sm" flexShrink={0}>{i + 1}</Flex>
                        <Box flex="1" minW={0}>
                          <HStack><Text fontWeight="semibold">{s.title}</Text><StageStatusBadge status={s.status} /></HStack>
                          {s.description && <Text fontSize="sm" color="gray.600" mt={1}>{s.description}</Text>}
                          {s.target_sessions > 0 && (
                            <Box mt={2}>
                              <HStack justify="space-between" mb={1}><Text fontSize="xs" color="gray.500">{s.completed_sessions}/{s.target_sessions} sessões</Text><Text fontSize="xs" color="gray.500">{pct}%</Text></HStack>
                              <Progress value={pct} size="sm" colorScheme="brand" borderRadius="full" />
                            </Box>
                          )}
                        </Box>
                        <VStack spacing={1}>
                          <Select size="xs" w="130px" value={s.status} onChange={(e) => stageStatusMut.mutate({ stageId: s.id, status: e.target.value as StageStatus })}>
                            {Object.entries(STAGE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </Select>
                          <IconButton aria-label="Excluir" size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => delStageMut.mutate(s.id)} />
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>
                );
              })}
            </Stack>
          )}
        </CardBody>
      </Card>

      <StageModal treatmentId={data.id} disc={stageDisc} onSaved={invalidate} />
    </Box>
  );
}

function StageModal({ treatmentId, disc, onSaved }: { treatmentId: string; disc: any; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ title: '', description: '', target_sessions: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api(`/treatments/${treatmentId}/stages`, {
      method: 'POST',
      body: { title: form.title, description: form.description || null, target_sessions: parseInt(form.target_sessions) || 0 },
    }),
    onSuccess: () => { toast({ status: 'success', title: 'Etapa adicionada' }); setForm({ title: '', description: '', target_sessions: '' }); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose}>
      <ModalOverlay /><ModalContent>
        <ModalHeader>Nova etapa</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <FormControl isRequired><FormLabel>Título</FormLabel><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Fase 1 — Controle da dor" /></FormControl>
          <FormControl><FormLabel>Descrição</FormLabel><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></FormControl>
          <FormControl><FormLabel>Meta de sessões</FormLabel><NumberInput min={0} value={form.target_sessions} onChange={(v) => set('target_sessions', v)}><NumberInputField /></NumberInput></FormControl>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!form.title}>Adicionar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
