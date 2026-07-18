import { useEffect, useState } from 'react';
import {
  Box, Card, CardBody, Heading, Stack, FormControl, FormLabel, Input, Button, useToast, SimpleGrid,
  NumberInput, NumberInputField, Text, Divider, Table, Thead, Tbody, Tr, Th, Td, Badge,
  Tabs, TabList, Tab, TabPanels, TabPanel, Select
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, Loading } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<any>({ name: '', phone: '', address: '', slot_granularity_minutes: 30 });
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name || '', password: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api<any>('/settings', { auth: false }) });
  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => api<any[]>('/settings/staff') });

  useEffect(() => { if (data) setForm({ slot_granularity_minutes: 30, ...data }); }, [data]);

  const mut = useMutation({
    mutationFn: () => api('/settings', { method: 'PUT', body: { ...form, slot_granularity_minutes: Number(form.slot_granularity_minutes) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ status: 'success', title: 'Configurações salvas' }); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      if (profileForm.full_name !== profile?.full_name) {
        await api('/auth/me', { method: 'PUT', body: { full_name: profileForm.full_name } });
      }
      if (profileForm.password) {
        const { error } = await supabase.auth.updateUser({ password: profileForm.password });
        if (error) throw error;
      }
      toast({ status: 'success', title: 'Perfil atualizado' });
      setProfileForm(f => ({ ...f, password: '' }));
      qc.invalidateQueries({ queryKey: ['auth-session'] }); // force refresh context if needed
    } catch (e: any) {
      toast({ status: 'error', title: 'Erro ao atualizar perfil', description: e.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [editingRole, setEditingRole] = useState<{ id: string, name: string, role: string } | null>(null);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState('therapist');

  const roleMut = useMutation({
    mutationFn: (data: { id: string, role: string }) => api(`/settings/staff/${data.id}/role`, { method: 'PUT', body: { role: data.role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast({ status: 'success', title: 'Papel atualizado' }); setEditingRole(null); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  const promoteMut = useMutation({
    mutationFn: () => api('/settings/staff/promote-email', { method: 'PUT', body: { email: promoteEmail, role: promoteRole } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast({ status: 'success', title: 'Usuário adicionado à equipe' }); setPromoteEmail(''); },
    onError: (e: any) => toast({ status: 'error', title: 'Erro', description: e.message }),
  });

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader title="Configurações" subtitle="Gestão da clínica e do seu perfil" />
      
      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab>Meu Perfil</Tab>
          <Tab>Clínica</Tab>
          {profile?.role === 'admin' && <Tab>Equipe</Tab>}
          {profile?.role === 'admin' && <Tab>Exportar Dados</Tab>}
        </TabList>
        
        <TabPanels>
          {/* Aba Meu Perfil */}
          <TabPanel px={0} py={6}>
            <Card maxW="600px">
              <CardBody>
                <Heading size="sm" mb={4}>Meu Perfil</Heading>
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Nome Completo</FormLabel>
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nova Senha</FormLabel>
                    <Input type="password" value={profileForm.password} onChange={(e) => setProfileForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe em branco para manter" />
                  </FormControl>
                  <Button onClick={handleSaveProfile} isLoading={isSavingProfile} isDisabled={!profileForm.full_name} alignSelf="flex-start">Salvar Perfil</Button>
                </Stack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Aba Clínica */}
          <TabPanel px={0} py={6}>
            <Card maxW="600px">
              <CardBody>
                <Heading size="sm" mb={4}>Dados da clínica</Heading>
                <Stack spacing={4}>
                  <FormControl><FormLabel>Nome</FormLabel><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></FormControl>
                  <FormControl><FormLabel>Telefone</FormLabel><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></FormControl>
                  <FormControl><FormLabel>Endereço</FormLabel><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></FormControl>
                  <FormControl><FormLabel>Chave PIX</FormLabel><Input value={form.pix_key || ''} onChange={(e) => set('pix_key', e.target.value)} placeholder="CNPJ, E-mail, Telefone ou Aleatória" /></FormControl>
                  <FormControl>
                    <FormLabel>Granularidade dos horários (min)</FormLabel>
                    <NumberInput min={5} step={5} value={form.slot_granularity_minutes} onChange={(v) => set('slot_granularity_minutes', v)}><NumberInputField /></NumberInput>
                    <Text fontSize="xs" color="gray.400" mt={1}>Intervalo entre horários oferecidos (ex.: 30 min).</Text>
                  </FormControl>
                  <Button onClick={() => mut.mutate()} isLoading={mut.isPending} alignSelf="flex-start">Salvar</Button>
                </Stack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Aba Equipe */}
          {profile?.role === 'admin' && (
            <TabPanel px={0} py={6}>
              <Card maxW="800px">
                <CardBody>
                  <Heading size="sm" mb={4}>Membros da Equipe</Heading>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead><Tr><Th>Nome</Th><Th>Papel</Th><Th w="50px">Ações</Th></Tr></Thead>
                      <Tbody>
                        {(staff || []).map((s) => (
                          <Tr key={s.id}>
                            <Td>{s.full_name || s.email}{s.id === profile?.id && <Badge ml={2} colorScheme="brand">você</Badge>}</Td>
                            <Td>
                              <Badge colorScheme={s.role === 'admin' ? 'purple' : s.role === 'subadmin' ? 'orange' : 'blue'}>
                                {s.role}
                              </Badge>
                            </Td>
                            <Td>
                              <Button size="xs" variant="outline" onClick={() => setEditingRole({ id: s.id, name: s.full_name || s.email, role: s.role })}>
                                Editar
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  <Divider my={6} />
                  <Heading size="sm" mb={4}>Adicionar à Equipe</Heading>
                  <Text fontSize="sm" color="gray.500" mb={4}>
                    Para adicionar alguém à equipe, a pessoa deve primeiro <b>criar uma conta</b> na página de login. Depois, informe o e-mail dela abaixo e escolha o papel.
                  </Text>
                  <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                    <Input placeholder="E-mail do usuário cadastrado" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} />
                    <Select w={{ md: '200px' }} value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="subadmin">Subadmin</option>
                      <option value="therapist">Fisioterapeuta</option>
                    </Select>
                    <Button onClick={() => promoteMut.mutate()} isLoading={promoteMut.isPending} isDisabled={!promoteEmail}>Adicionar</Button>
                  </Stack>
                </CardBody>
              </Card>
            </TabPanel>
          )}

          {/* Aba Exportar Dados */}
          {profile?.role === 'admin' && (
            <TabPanel px={0} py={6}>
              <Card maxW="600px">
                <CardBody>
                  <Heading size="sm" mb={4}>Exportação de Dados</Heading>
                  <Text fontSize="sm" color="gray.500" mb={4}>
                    Baixe um arquivo JSON contendo todos os pacientes, tratamentos, evoluções e agendamentos.
                  </Text>
                  <Button 
                    onClick={async () => {
                      try {
                        const res = await api('/settings/backup', { method: 'GET' });
                        const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup-fisioforme-${Date.now()}.json`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        toast({ status: 'success', title: 'Backup exportado com sucesso' });
                      } catch (e: any) {
                        toast({ status: 'error', title: 'Erro ao exportar backup', description: e.message });
                      }
                    }}
                    colorScheme="purple"
                  >
                    Exportar Backup do Sistema
                  </Button>
                </CardBody>
              </Card>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* Modal Edição de Papel */}
      {!!editingRole && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="blackAlpha.500" zIndex={1400} display="flex" alignItems="center" justifyContent="center">
          <Card w="90%" maxW="400px">
            <CardBody>
              <Heading size="sm" mb={4}>Editar Papel: {editingRole.name}</Heading>
              <FormControl mb={4}>
                <FormLabel>Nível de Acesso</FormLabel>
                <Select value={editingRole.role} onChange={(e) => setEditingRole({ ...editingRole, role: e.target.value })}>
                  <option value="admin">Admin (Acesso Total)</option>
                  <option value="subadmin">Subadmin (Sem equipe/backup)</option>
                  <option value="therapist">Fisioterapeuta (Padrão)</option>
                  <option value="patient">Paciente (Sem acesso)</option>
                </Select>
              </FormControl>
              <Stack direction="row" justify="flex-end">
                <Button variant="ghost" onClick={() => setEditingRole(null)}>Cancelar</Button>
                <Button onClick={() => roleMut.mutate(editingRole)} isLoading={roleMut.isPending}>Salvar</Button>
              </Stack>
            </CardBody>
          </Card>
        </Box>
      )}
    </Box>
  );
}
