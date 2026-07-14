import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, HStack, Input, InputGroup, InputLeftElement, Icon, Table, Thead, Tbody, Tr, Th, Td,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Stack, Select, SimpleGrid, useToast, Avatar, Text, Badge, Show, VStack,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiUserPlus } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { PageHeader, Loading, EmptyState } from '../../components/ui';
import { fmtDate, ageFrom } from '../../lib/format';

export default function Patients() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => api<Patient[]>('/patients', { query: { search } }),
  });

  return (
    <Box>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro e prontuário dos pacientes"
        action={<Button leftIcon={<FiPlus />} onClick={onOpen} w={{ base: 'full', md: 'auto' }}>Novo paciente</Button>}
      />

      <InputGroup mb={4} maxW="420px">
        <InputLeftElement pointerEvents="none"><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
        <Input placeholder="Buscar por nome, telefone, e-mail ou documento" value={search} onChange={(e) => setSearch(e.target.value)} bg="white" />
      </InputGroup>

      <Card>
        <CardBody p={{ base: 2, md: 0 }}>
          {isLoading ? <Loading /> : !data || data.length === 0 ? (
            <EmptyState icon={FiUserPlus} title="Nenhum paciente" description="Cadastre o primeiro paciente." action={<Button leftIcon={<FiPlus />} onClick={onOpen}>Novo paciente</Button>} />
          ) : (
            <>
              {/* Desktop table */}
              <Show above="md">
                <Box overflowX="auto">
                  <Table>
                    <Thead><Tr><Th>Nome</Th><Th>Contato</Th><Th>Idade</Th><Th>Cadastro</Th><Th>Status</Th></Tr></Thead>
                    <Tbody>
                      {data.map((p) => (
                        <Tr key={p.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => navigate(`/app/pacientes/${p.id}`)}>
                          <Td>
                            <HStack><Avatar size="sm" name={p.full_name} bg="brand.500" color="white" /><Text fontWeight="medium">{p.full_name}</Text></HStack>
                          </Td>
                          <Td><Text fontSize="sm">{p.phone || '—'}</Text><Text fontSize="xs" color="gray.500">{p.email || ''}</Text></Td>
                          <Td>{ageFrom(p.birth_date) || '—'}</Td>
                          <Td>{fmtDate(p.created_at)}</Td>
                          <Td>{p.active ? <Badge colorScheme="green">Ativo</Badge> : <Badge>Inativo</Badge>}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Show>
              {/* Mobile cards */}
              <Show below="md">
                <VStack align="stretch" spacing={2} p={2}>
                  {data.map((p) => (
                    <Card key={p.id} variant="outline" cursor="pointer" onClick={() => navigate(`/app/pacientes/${p.id}`)}>
                      <CardBody py={3}>
                        <HStack>
                          <Avatar size="sm" name={p.full_name} bg="brand.500" color="white" />
                          <Box flex="1" minW={0}>
                            <Text fontWeight="medium" noOfLines={1}>{p.full_name}</Text>
                            <Text fontSize="sm" color="gray.500">{p.phone || p.email || '—'}</Text>
                          </Box>
                          {p.active ? <Badge colorScheme="green">Ativo</Badge> : <Badge>Inativo</Badge>}
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Show>
            </>
          )}
        </CardBody>
      </Card>

      <PatientModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}

function PatientModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>({ full_name: '', email: '', phone: '', birth_date: '', gender: 'unspecified', document: '', main_complaint: '' });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => api<Patient>('/patients', { method: 'POST', body: cleaned(form) }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      toast({ status: 'success', title: 'Paciente cadastrado' });
      onClose();
      navigate(`/app/pacientes/${p.id}`);
    },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Novo paciente</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Nome completo</FormLabel>
              <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </FormControl>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <FormControl><FormLabel>Telefone</FormLabel><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></FormControl>
              <FormControl><FormLabel>E-mail</FormLabel><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Nascimento</FormLabel><Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></FormControl>
              <FormControl>
                <FormLabel>Sexo</FormLabel>
                <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="unspecified">Não informado</option>
                  <option value="female">Feminino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Outro</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel>Documento (CPF)</FormLabel><Input value={form.document} onChange={(e) => set('document', e.target.value)} /></FormControl>
            </SimpleGrid>
            <FormControl><FormLabel>Queixa principal</FormLabel><Input value={form.main_complaint} onChange={(e) => set('main_complaint', e.target.value)} /></FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} isLoading={mut.isPending} isDisabled={!form.full_name}>Cadastrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function cleaned(form: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(form)) out[k] = v === '' ? null : v;
  out.full_name = form.full_name;
  return out;
}
