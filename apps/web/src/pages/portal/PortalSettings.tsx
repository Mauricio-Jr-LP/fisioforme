import { useState } from 'react';
import { Box, Card, CardBody, Heading, Stack, FormControl, FormLabel, Input, Button, useToast, Icon } from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function PortalSettings() {
  const toast = useToast();
  const { profile } = useAuth();
  
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name || '', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
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
      // Reload the page to reflect the new name in AuthContext globally if needed
      window.location.reload();
    } catch (e: any) {
      toast({ status: 'error', title: 'Erro ao atualizar perfil', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Heading size="sm" mb={3}><Icon as={FiSettings} mr={2} />Configurações da Conta</Heading>
      <Card>
        <CardBody>
          <Stack spacing={4} maxW="400px">
            <FormControl>
              <FormLabel>Nome Completo</FormLabel>
              <Input value={profileForm.full_name} onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
            </FormControl>
            <FormControl>
              <FormLabel>Nova Senha</FormLabel>
              <Input type="password" value={profileForm.password} onChange={(e) => setProfileForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe em branco para manter" />
            </FormControl>
            <Button colorScheme="brand" onClick={handleSaveProfile} isLoading={isSaving} isDisabled={!profileForm.full_name} w="fit-content">Salvar Perfil</Button>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
}
