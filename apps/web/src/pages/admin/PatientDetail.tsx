import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, Heading, HStack, VStack, Text, Avatar, Tabs, TabList, Tab, TabPanels, TabPanel,
  SimpleGrid, Stack, FormControl, FormLabel, Input, Textarea, Select, useToast, useDisclosure, Icon, Divider,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Badge, Wrap, WrapItem,
  Flex, IconButton, Link, Image, NumberInput, NumberInputField,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiEdit2, FiPlus, FiActivity, FiFileText, FiMessageSquare, FiCalendar, FiTrash2, FiImage, FiSave, FiShield,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient, Treatment, Consultation, PatientNote, Appointment } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { uploadAttachment } from '../../lib/upload';
import { Loading, TreatmentStatusBadge, AppointmentStatusBadge, EmptyState, WhatsAppLink } from '../../components/ui';
import { WaiverTemplate } from '../../components/WaiverTemplate';
import { fmtDate, fmtDateTime, ageFrom } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

type FullPatient = Patient & {
  treatments: Treatment[];
  consultations: Consultation[];
  notes: (PatientNote & { author_name?: string })[];
  appointments: (Appointment & { service_name?: string; service_color?: string })[];
  attachments?: any[];
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api<FullPatient>(`/patients/${id}`),
    enabled: !!id,
  });

  const { isStaff, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const promoteMut = useMutation({
    mutationFn: () => api(`/settings/staff/${data?.profile_id}/promote`, { method: 'PUT' }),
    onSuccess: () => { toast({ status: 'success', title: 'Usuário promovido a equipe' }); qc.invalidateQueries({ queryKey: ['patient', id] }); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const editDisc = useDisclosure();
  const treatDisc = useDisclosure();
  const consultDisc = useDisclosure();
  const noteDisc = useDisclosure();
  const toast = useToast();

  if (isLoading || !data) return <Loading />;

  return (
    <Box>
      <Link as={RouterLink} to="/app/pacientes" color="gray.500" mb={3} display="inline-flex" alignItems="center">
        <Icon as={FiArrowLeft} mr={1} /> Pacientes
      </Link>

      <Card mb={4}>
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ md: 'center' }}>
            <HStack>
              <Avatar size="lg" name={data.full_name} bg="brand.500" color="white" />
              <Box>
                <Heading size="md">{data.full_name}</Heading>
                <Text color="gray.500" fontSize="sm">
                  {ageFrom(data.birth_date)} {data.phone ? `· ${data.phone}` : ''}
                </Text>
                {data.main_complaint && <Badge mt={1} colorScheme="brand">{data.main_complaint}</Badge>}
              </Box>
            </HStack>
            <Button ml={{ md: 'auto' }} leftIcon={<FiEdit2 />} variant="outline" onClick={editDisc.onOpen} w={{ base: 'full', md: 'auto' }}>
              Editar dados
            </Button>
            {isAdmin && data.profile_id && (
              <Button leftIcon={<FiShield />} variant="ghost" colorScheme="purple" onClick={() => promoteMut.mutate()} isLoading={promoteMut.isPending}>
                Tornar Equipe
              </Button>
            )}
          </Flex>
        </CardBody>
      </Card>

      <Tabs colorScheme="brand" variant="soft-rounded" isLazy>
        <Box overflowX="auto">
          <TabList>
            <Tab><Icon as={FiFileText} mr={2} />Prontuário</Tab>
            <Tab><Icon as={FiActivity} mr={2} />Tratamentos</Tab>
            <Tab><Icon as={FiMessageSquare} mr={2} />Evoluções</Tab>
            <Tab><Icon as={FiFileText} mr={2} />Documentos</Tab>
            <Tab><Icon as={FiCalendar} mr={2} />Agenda</Tab>
          </TabList>
        </Box>

        <TabPanels>
          {/* Prontuário / anamnese */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              <InfoCard title="Dados pessoais">
                <InfoRow label="E-mail" value={data.email} />
                <InfoRow label="Telefone" value={<WhatsAppLink phone={data.phone} />} />
                <InfoRow label="Nascimento" value={fmtDate(data.birth_date)} />
                <InfoRow label="Documento" value={data.document} />
                <InfoRow label="Endereço" value={data.address} />
                <InfoRow label="Contato emergência" value={data.emergency_contact} />
              </InfoCard>
              <InfoCard title="Anamnese">
                <InfoRow label="Queixa principal" value={data.main_complaint} />
                <InfoRow label="Histórico médico" value={data.medical_history} />
                <InfoRow label="Alergias" value={data.allergies} />
                <InfoRow label="Medicações" value={data.medications} />
                <InfoRow label="Observações" value={data.notes} />
              </InfoCard>
            </SimpleGrid>

            <Card mt={4}>
              <CardBody>
                <HStack mb={3}>
                  <Heading size="sm">Anotações</Heading>
                  <Button size="xs" ml="auto" leftIcon={<FiPlus />} onClick={noteDisc.onOpen}>Nova</Button>
                </HStack>
                {data.notes.length === 0 ? (
                  <Text color="gray.400" fontSize="sm">Sem anotações.</Text>
                ) : (
                  <Stack divider={<Divider />} spacing={3}>
                    {data.notes.map((n) => (
                      <Box key={n.id}>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">{n.title || 'Anotação'}</Text>
                          <Text fontSize="xs" color="gray.400">{fmtDateTime(n.created_at)}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">{n.body}</Text>
                        {n.author_name && <Text fontSize="xs" color="gray.400" mt={1}>— {n.author_name}</Text>}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Tratamentos */}
          <TabPanel px={0}>
            <HStack mb={4}><Button leftIcon={<FiPlus />} onClick={treatDisc.onOpen}>Novo tratamento</Button></HStack>
            {data.treatments.length === 0 ? (
              <EmptyState icon={FiActivity} title="Sem tratamentos" description="Crie um plano de tratamento com etapas." />
            ) : (
              <Stack spacing={3}>
                {data.treatments.map((t) => (
                  <Card key={t.id} cursor="pointer" _hover={{ shadow: 'md' }} onClick={() => navigate(`/app/tratamentos/${t.id}`)}>
                    <CardBody>
                      <Flex align="center" gap={3}>
                        <Box flex="1" minW={0}>
                          <HStack><Text fontWeight="semibold">{t.title}</Text><TreatmentStatusBadge status={t.status} /></HStack>
                          {t.diagnosis && <Text fontSize="sm" color="gray.500" noOfLines={1}>{t.diagnosis}</Text>}
                          <Text fontSize="xs" color="gray.400" mt={1}>Início: {fmtDate(t.start_date)}</Text>
                        </Box>
                        <Icon as={FiArrowLeft} transform="rotate(180deg)" color="gray.400" />
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>

            {/* Evoluções */}
          <TabPanel px={0}>
            <HStack mb={4}><Button leftIcon={<FiPlus />} onClick={consultDisc.onOpen}>Nova evolução</Button></HStack>
            {data.consultations.length === 0 ? (
              <EmptyState icon={FiMessageSquare} title="Sem evoluções" description="Registre a evolução de cada sessão (SOAP + fotos)." />
            ) : (
              <Stack spacing={3}>
                {data.consultations.map((c) => <ConsultationCard key={c.id} consultation={c} patientId={data.id} onChange={() => qc.invalidateQueries({ queryKey: ['patient', id] })} />)}
              </Stack>
            )}
          </TabPanel>

          {/* Documentos */}
          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box>
                <Heading size="sm" mb={3}>Gerar Termos</Heading>
                <WaiverTemplate patient={data} />
              </Box>
              <Divider />
              <Box>
                <Heading size="sm" mb={3}>Documentos Anexados</Heading>
                {(!data.attachments || data.attachments.length === 0) ? (
                  <Text color="gray.400" fontSize="sm">Nenhum documento anexado.</Text>
                ) : (
                  <Wrap mb={4}>
                    {data.attachments.map((a: any) => (
                      <WrapItem key={a.id}>
                        <Link href={a.file_url || '#'} isExternal>
                          <Badge p={2} cursor="pointer" _hover={{ bg: 'gray.200' }}>
                            <Icon as={FiFileText} mr={1} />
                            {a.file_name}
                          </Badge>
                        </Link>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
                <Button as="label" variant="outline" size="sm" leftIcon={<FiPlus />} cursor="pointer">
                  Anexar arquivo
                  <input type="file" hidden onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await uploadAttachment(file, 'patient', data.id);
                      toast({ status: 'success', title: 'Arquivo anexado' });
                      qc.invalidateQueries({ queryKey: ['patient', id] });
                    } catch (err: any) {
                      toast({ status: 'error', title: 'Erro', description: err.message });
                    }
                  }} />
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* Agenda */}
          <TabPanel px={0}>
            {data.appointments.length === 0 ? (
              <EmptyState icon={FiCalendar} title="Sem agendamentos" />
            ) : (
              <Stack spacing={2}>
                {data.appointments.map((a) => (
                  <Card key={a.id}><CardBody py={3}>
                    <Flex align="center" gap={3}>
                      <Box w="4px" h="36px" borderRadius="full" bg={a.service_color || 'gray.300'} />
                      <Box flex="1"><Text fontWeight="medium">{a.service_name || 'Serviço'}</Text><Text fontSize="sm" color="gray.500">{fmtDateTime(a.start_time)}</Text></Box>
                      <AppointmentStatusBadge status={a.status} />
                    </Flex>
                  </CardBody></Card>
                ))}
              </Stack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <EditPatientModal patient={data} disc={editDisc} onSaved={() => qc.invalidateQueries({ queryKey: ['patient', id] })} />
      <NewTreatmentModal patientId={data.id} disc={treatDisc} onSaved={(tid) => navigate(`/app/tratamentos/${tid}`)} />
      <NewConsultationModal patient={data} disc={consultDisc} onSaved={() => qc.invalidateQueries({ queryKey: ['patient', id] })} />
      <NewNoteModal patientId={data.id} disc={noteDisc} onSaved={() => qc.invalidateQueries({ queryKey: ['patient', id] })} />
    </Box>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardBody><Heading size="sm" mb={3}>{title}</Heading><Stack spacing={2}>{children}</Stack></CardBody></Card>;
}
function InfoRow({ label, value }: { label: string; value?: string | React.ReactNode | null }) {
  return (
    <HStack align="start" spacing={3}>
      <Text fontSize="sm" color="gray.500" minW="140px">{label}</Text>
      <Box fontSize="sm" whiteSpace="pre-wrap">{value || '—'}</Box>
    </HStack>
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
    <Card>
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
          Anexar foto (Câmera/Arquivo)
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

// ── Modais ───────────────────────────────────────────────────
function EditPatientModal({ patient, disc, onSaved }: { patient: Patient; disc: any; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>(patient);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api(`/patients/${patient.id}`, { method: 'PUT', body: form }),
    onSuccess: () => { toast({ status: 'success', title: 'Salvo' }); onSaved(); disc.onClose(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent>
        <ModalHeader>Editar paciente</ModalHeader><ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired><FormLabel>Nome</FormLabel><Input value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} /></FormControl>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <FormControl><FormLabel>Telefone</FormLabel><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></FormControl>
              <FormControl><FormLabel>E-mail</FormLabel><Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Nascimento</FormLabel><Input type="date" value={form.birth_date || ''} onChange={(e) => set('birth_date', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Sexo</FormLabel>
                <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="unspecified">Não informado</option><option value="female">Feminino</option><option value="male">Masculino</option><option value="other">Outro</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel>Documento</FormLabel><Input value={form.document || ''} onChange={(e) => set('document', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Contato emergência</FormLabel><Input value={form.emergency_contact || ''} onChange={(e) => set('emergency_contact', e.target.value)} /></FormControl>
            </SimpleGrid>
            <FormControl><FormLabel>Endereço</FormLabel><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></FormControl>
            <FormControl><FormLabel>Queixa principal</FormLabel><Input value={form.main_complaint || ''} onChange={(e) => set('main_complaint', e.target.value)} /></FormControl>
            <FormControl><FormLabel>Histórico médico</FormLabel><Textarea value={form.medical_history || ''} onChange={(e) => set('medical_history', e.target.value)} /></FormControl>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <FormControl><FormLabel>Alergias</FormLabel><Textarea value={form.allergies || ''} onChange={(e) => set('allergies', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Medicações</FormLabel><Textarea value={form.medications || ''} onChange={(e) => set('medications', e.target.value)} /></FormControl>
            </SimpleGrid>
            <FormControl><FormLabel>Observações</FormLabel><Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button leftIcon={<FiSave />} onClick={() => mut.mutate()} isLoading={mut.isPending}>Salvar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function NewTreatmentModal({ patientId, disc, onSaved }: { patientId: string; disc: any; onSaved: (id: string) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ title: '', diagnosis: '', description: '', start_date: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api<Treatment>('/treatments', { method: 'POST', body: { patient_id: patientId, ...clean(form) } }),
    onSuccess: (t) => { toast({ status: 'success', title: 'Tratamento criado' }); disc.onClose(); onSaved(t.id); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size="lg">
      <ModalOverlay /><ModalContent>
        <ModalHeader>Novo tratamento</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <FormControl isRequired><FormLabel>Título</FormLabel><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Reabilitação de ombro" /></FormControl>
          <FormControl><FormLabel>Diagnóstico</FormLabel><Input value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} /></FormControl>
          <FormControl><FormLabel>Descrição</FormLabel><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></FormControl>
          <FormControl><FormLabel>Data de início</FormLabel><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></FormControl>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!form.title}>Criar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function NewConsultationModal({ patient, disc, onSaved }: { patient: FullPatient; disc: any; onSaved: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ date: today, treatment_id: '', pain_level: '', subjective: '', objective: '', assessment: '', plan: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api<Consultation>('/consultations', {
      method: 'POST',
      body: {
        patient_id: patient.id, date: form.date,
        treatment_id: form.treatment_id || null,
        pain_level: form.pain_level === '' ? null : (parseInt(form.pain_level) || 0),
        subjective: form.subjective || null, objective: form.objective || null,
        assessment: form.assessment || null, plan: form.plan || null,
      },
    }),
    onSuccess: () => { toast({ status: 'success', title: 'Evolução registrada' }); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent>
        <ModalHeader>Nova evolução (SOAP)</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            <FormControl isRequired><FormLabel>Data</FormLabel><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></FormControl>
            <FormControl><FormLabel>Tratamento</FormLabel>
              <Select placeholder="Nenhum" value={form.treatment_id} onChange={(e) => set('treatment_id', e.target.value)}>
                {patient.treatments.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
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
          <Text fontSize="xs" color="gray.400">Você poderá anexar fotos após salvar a evolução.</Text>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending}>Salvar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function NewNoteModal({ patientId, disc, onSaved }: { patientId: string; disc: any; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const mut = useMutation({
    mutationFn: () => api(`/patients/${patientId}/notes`, { method: 'POST', body: { title: title || null, body } }),
    onSuccess: () => { toast({ status: 'success', title: 'Anotação salva' }); setTitle(''); setBody(''); disc.onClose(); onSaved(); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });
  return (
    <Modal isOpen={disc.isOpen} onClose={disc.onClose}>
      <ModalOverlay /><ModalContent>
        <ModalHeader>Nova anotação</ModalHeader><ModalCloseButton />
        <ModalBody><Stack spacing={4}>
          <FormControl><FormLabel>Título</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormControl>
          <FormControl isRequired><FormLabel>Texto</FormLabel><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} /></FormControl>
        </Stack></ModalBody>
        <ModalFooter><Button variant="ghost" mr={3} onClick={disc.onClose}>Cancelar</Button><Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!body}>Salvar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function clean(form: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(form)) if (v !== '') out[k] = v;
  return out;
}
