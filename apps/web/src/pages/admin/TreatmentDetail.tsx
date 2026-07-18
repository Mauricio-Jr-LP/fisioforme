import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, Heading, HStack, VStack, Text, Icon, Link, Progress, Badge, Stack,
  Select, useToast, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, FormControl, FormLabel, Input, Textarea, NumberInput, NumberInputField, SimpleGrid,
  IconButton, Divider, Flex, Wrap, WrapItem, Image,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiEdit2, FiFileText, FiImage, FiMessageSquare } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Treatment, TreatmentStage, Consultation, StageStatus, TreatmentStatus } from '@fisioforme/shared';
import { STAGE_STATUS_LABELS } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { uploadAttachment } from '../../lib/upload';
import { Loading, TreatmentStatusBadge, StageStatusBadge, EmptyState, ConfirmDialog } from '../../components/ui';
import { fmtDate } from '../../lib/format';

type FullTreatment = Treatment & { stages: TreatmentStage[]; consultations: Consultation[] };

export default function TreatmentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const stageDisc = useDisclosure();
  const consultDisc = useDisclosure();
  const paymentDisc = useDisclosure();
  const [editingStage, setEditingStage] = useState<TreatmentStage | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

  const openStageModal = (stage?: TreatmentStage) => {
    setEditingStage(stage || null);
    stageDisc.onOpen();
  };

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
              <Button leftIcon={<FiEdit2 />} colorScheme="green" variant="outline" size="sm" onClick={paymentDisc.onOpen}>
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
            <Button size="sm" ml="auto" leftIcon={<FiPlus />} onClick={() => openStageModal()}>Nova etapa</Button>
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
                              <HStack justify="space-between" mb={1}>
                                <HStack>
                                  <Text fontSize="xs" color="gray.500">{s.completed_sessions}/{s.target_sessions} sessões</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500">{pct}%</Text>
                              </HStack>
                              <Progress value={pct} size="sm" colorScheme="brand" borderRadius="full" />
                            </Box>
                          )}
                        </Box>
                        <VStack spacing={1}>
                          <Select size="xs" w="130px" value={s.status} onChange={(e) => stageStatusMut.mutate({ stageId: s.id, status: e.target.value as StageStatus })}>
                            {Object.entries(STAGE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </Select>
                          <HStack spacing={1} alignSelf="flex-end">
                            <IconButton aria-label="Editar" size="xs" variant="ghost" colorScheme="brand" icon={<FiEdit2 />} onClick={() => openStageModal(s)} />
                            <IconButton aria-label="Excluir" size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => setDeletingStageId(s.id)} />
                          </HStack>
                        </VStack>
                      </Flex>
                      
                      {(() => {
                        const stageConsultations = data.consultations?.filter(c => c.stage_id === s.id) || [];
                        if (stageConsultations.length === 0) return null;
                        
                        return (
                          <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.100">
                            <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.600">Sessões nesta etapa</Text>
                            <Stack spacing={4} pl={4} borderLeft="2px solid" borderColor="brand.100" position="relative">
                              {stageConsultations.map(c => (
                                <Box key={c.id} position="relative">
                                  <Box position="absolute" left="-21px" top="4px" boxSize="10px" borderRadius="full" bg="brand.400" />
                                  <HStack mb={1}>
                                    <Text fontSize="xs" fontWeight="bold" color="gray.500">{fmtDate(c.date)}</Text>
                                    {c.pain_level != null && <Badge fontSize="0.6rem" colorScheme={c.pain_level >= 7 ? 'red' : c.pain_level >= 4 ? 'orange' : 'green'}>Dor {c.pain_level}/10</Badge>}
                                  </HStack>
                                  <Text fontSize="sm" color="gray.700" noOfLines={2}>
                                    {c.subjective || c.objective || c.assessment || c.plan || 'Registro de sessão sem notas detalhadas.'}
                                  </Text>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        );
                      })()}
                    </CardBody>
                  </Card>
                );
              })}
            </Stack>
          )}
        </CardBody>
      </Card>

      <Card mt={4}>
        <CardBody>
          <HStack mb={4}>
            <Heading size="sm">Evoluções (Sessões)</Heading>
            <Button size="sm" ml="auto" leftIcon={<FiPlus />} onClick={consultDisc.onOpen}>Nova evolução</Button>
          </HStack>
          
          {!data.consultations || data.consultations.length === 0 ? (
            <EmptyState icon={FiMessageSquare} title="Nenhuma evolução" description="Registre as sessões e acompanhe a melhora do paciente." />
          ) : (
            <Stack spacing={4}>
              {data.consultations.map((c) => (
                <ConsultationCard key={c.id} consultation={c} patientId={data.patient_id} onChange={invalidate} />
              ))}
            </Stack>
          )}
        </CardBody>
      </Card>

      <StageModal treatmentId={data.id} disc={stageDisc} onSaved={invalidate} initialData={editingStage} />
      <TreatmentConsultationModal treatment={data} disc={consultDisc} onSaved={invalidate} />
      <PaymentModal treatment={data} disc={paymentDisc} onSaved={invalidate} />

      <ConfirmDialog
        isOpen={!!deletingStageId}
        onClose={() => setDeletingStageId(null)}
        onConfirm={() => {
          if (deletingStageId) delStageMut.mutate(deletingStageId);
          setDeletingStageId(null);
        }}
        title="Excluir Etapa"
        description="Tem certeza que deseja excluir esta etapa? Isso não poderá ser desfeito."
      />
    </Box>
  );
}

function StageModal({ treatmentId, disc, onSaved, initialData }: { treatmentId: string; disc: any; onSaved: () => void; initialData: TreatmentStage | null }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ title: '', description: '', target_sessions: '' });
  
  useEffect(() => {
    if (disc.isOpen) {
      if (initialData) {
        setForm({ title: initialData.title, description: initialData.description || '', target_sessions: initialData.target_sessions || '' });
      } else {
        setForm({ title: '', description: '', target_sessions: '' });
      }
    }
  }, [disc.isOpen, initialData]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  
  const mut = useMutation({
    mutationFn: () => {
      const body = { title: form.title, description: form.description || null, target_sessions: parseInt(form.target_sessions) || 0 };
      if (initialData) {
        return api(`/treatments/${treatmentId}/stages/${initialData.id}`, { method: 'PUT', body });
      }
      return api(`/treatments/${treatmentId}/stages`, { method: 'POST', body });
    },
    onSuccess: () => { 
      toast({ status: 'success', title: initialData ? 'Etapa atualizada' : 'Etapa adicionada' }); 
      disc.onClose(); 
      onSaved(); 
    },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size={{ base: 'full', md: 'md' }}>
      <ModalOverlay /><ModalContent>
        <ModalHeader>{initialData ? 'Editar etapa' : 'Nova etapa'}</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <FormControl isRequired><FormLabel>Título</FormLabel><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Fase 1 — Controle da dor" /></FormControl>
          <FormControl><FormLabel>Descrição</FormLabel><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></FormControl>
          <FormControl><FormLabel>Meta de sessões</FormLabel><NumberInput min={0} value={form.target_sessions} onChange={(v) => set('target_sessions', v)}><NumberInputField /></NumberInput></FormControl>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!form.title}>{initialData ? 'Salvar' : 'Adicionar'}</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function TreatmentConsultationModal({ treatment, disc, onSaved }: { treatment: FullTreatment; disc: any; onSaved: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ date: today, stage_id: '', pain_level: '', subjective: '', objective: '', assessment: '', plan: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  
  const mut = useMutation({
    mutationFn: () => api<Consultation>('/consultations', {
      method: 'POST',
      body: {
        patient_id: treatment.patient_id, date: form.date,
        treatment_id: treatment.id,
        stage_id: form.stage_id || null,
        pain_level: form.pain_level === '' ? null : (parseInt(form.pain_level) || 0),
        subjective: form.subjective || null, objective: form.objective || null,
        assessment: form.assessment || null, plan: form.plan || null,
      },
    }),
    onSuccess: () => { toast({ status: 'success', title: 'Evolução registrada' }); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size={{ base: 'full', md: '2xl' }} scrollBehavior="inside">
      <ModalOverlay /><ModalContent>
        <ModalHeader>Nova evolução (SOAP)</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            <FormControl isRequired><FormLabel>Data</FormLabel><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></FormControl>
            <FormControl><FormLabel>Etapa do Tratamento</FormLabel>
              <Select placeholder="Geral / Nenhuma" value={form.stage_id} onChange={(e) => set('stage_id', e.target.value)}>
                {treatment.stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </Select>
            </FormControl>
            <FormControl><FormLabel>Dor (EVA 0-10)</FormLabel>
              <NumberInput min={0} max={10} value={form.pain_level} onChange={(v) => set('pain_level', v)}><NumberInputField /></NumberInput>
            </FormControl>
          </SimpleGrid>
          <FormControl><FormLabel>S — Subjetivo (relato do paciente)</FormLabel><Textarea value={form.subjective} onChange={(e) => set('subjective', e.target.value)} /></FormControl>
          <FormControl><FormLabel>O — Objetivo (avaliação física)</FormLabel><Textarea value={form.objective} onChange={(e) => set('objective', e.target.value)} /></FormControl>
          <FormControl><FormLabel>A — Avaliação</FormLabel><Textarea value={form.assessment} onChange={(e) => set('assessment', e.target.value)} /></FormControl>
          <FormControl><FormLabel>P — Plano/conduta</FormLabel><Textarea value={form.plan} onChange={(e) => set('plan', e.target.value)} /></FormControl>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending}>Salvar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ConsultationCard({ consultation, patientId, onChange }: { consultation: Consultation; patientId: string; onChange: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: full } = useQuery({
    queryKey: ['consultation', consultation.id],
    queryFn: () => api<Consultation>(`/consultations/${consultation.id}`),
  });
  const c = full || consultation;

  const upload = async (file: File) => {
    try {
      await uploadAttachment(file, 'consultation', consultation.id);
      toast({ status: 'success', title: 'Foto anexada' });
      qc.invalidateQueries({ queryKey: ['consultation', consultation.id] });
      onChange();
    } catch (e: any) {
      toast({ status: 'error', title: 'Erro no upload', description: e.message });
    }
  };

  return (
    <Card variant="outline">
      <CardBody>
        <HStack mb={2}>
          <Text fontWeight="semibold">{fmtDate(c.date)}</Text>
          {c.pain_level != null && <Badge colorScheme={c.pain_level >= 7 ? 'red' : c.pain_level >= 4 ? 'orange' : 'green'}>Dor {c.pain_level}/10</Badge>}
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
          <SoapField label="S — Subjetivo" value={c.subjective} />
          <SoapField label="O — Objetivo" value={c.objective} />
          <SoapField label="A — Avaliação" value={c.assessment} />
          <SoapField label="P — Plano" value={c.plan} />
        </SimpleGrid>
        {c.notes && <Text fontSize="sm" color="gray.600" mt={2}>{c.notes}</Text>}

        {c.attachments && c.attachments.length > 0 && (
          <Wrap mt={3}>
            {c.attachments.map((a) => (
              <WrapItem key={a.id}>
                {a.file_type?.startsWith('image/') && a.file_url ? (
                  <Link href={a.file_url} isExternal><Image src={a.file_url} alt={a.file_name} boxSize="72px" objectFit="cover" borderRadius="md" /></Link>
                ) : (
                  <Link href={a.file_url || '#'} isExternal><Badge p={2}><Icon as={FiFileText} mr={1} />{a.file_name}</Badge></Link>
                )}
              </WrapItem>
            ))}
          </Wrap>
        )}

        <Button as="label" size="xs" mt={3} variant="outline" leftIcon={<FiImage />} cursor="pointer">
          Anexar foto
          <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </Button>
      </CardBody>
    </Card>
  );
}
function SoapField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <Box><Text fontSize="xs" fontWeight="bold" color="gray.500">{label}</Text><Text fontSize="sm" whiteSpace="pre-wrap">{value}</Text></Box>;
}

function PaymentModal({ treatment, disc, onSaved }: { treatment: FullTreatment; disc: any; onSaved: () => void }) {
  const [val, setVal] = useState('');
  const toast = useToast();
  
  const mut = useMutation({
    mutationFn: (amount: number) => {
      const newTotal = (treatment.amount_paid || 0) + amount;
      return api(`/treatments/${treatment.id}`, { method: 'PUT', body: { amount_paid: newTotal } });
    },
    onSuccess: () => {
      toast({ status: 'success', title: 'Pagamento registrado' });
      setVal('');
      disc.onClose();
      onSaved();
    },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const handleSave = () => {
    const amount = parseFloat(val.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return toast({ status: 'warning', title: 'Valor inválido' });
    mut.mutate(amount);
  };

  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size={{ base: 'full', md: 'md' }}>
      <ModalOverlay /><ModalContent>
        <ModalHeader>Registrar Pagamento</ModalHeader><ModalCloseButton />
        <ModalBody>
          <FormControl isRequired>
            <FormLabel>Valor pago adicional (R$)</FormLabel>
            <Input type="number" step="0.01" min="0" placeholder="Ex: 150.00" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button>
          <Button colorScheme="green" onClick={handleSave} isLoading={mut.isPending} isDisabled={!val}>Registrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
