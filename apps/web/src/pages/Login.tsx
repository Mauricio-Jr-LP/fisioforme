import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, Center, Flex, FormControl, FormLabel, Heading, Input,
  Stack, Text, useToast, Link, Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, signUp, session, profile, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!loading && session && profile) {
      navigate(isStaff ? '/app' : '/portal', { replace: true });
    }
  }, [loading, session, profile, isStaff, navigate]);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signIn(email, password);
      toast({ status: 'success', title: 'Bem-vindo!' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Falha no login', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || password.length < 6) {
      toast({ status: 'warning', title: 'Preencha nome, e-mail e senha (mín. 6 caracteres)' });
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, fullName);
      toast({ status: 'success', title: 'Conta criada!', description: 'Você já pode entrar.' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Falha no cadastro', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Center minH="100vh" bg="gray.50" px={4}>
      <Box w="full" maxW="420px">
        <Center mb={6} flexDir="column">
          <Flex boxSize={14} bg="brand.500" color="white" borderRadius="xl" align="center" justify="center" fontSize="2xl" fontWeight="bold" mb={3}>
            F
          </Flex>
          <Heading size="lg">FisioForme</Heading>
          <Text color="gray.500">Acesse sua conta</Text>
        </Center>

        <Card>
          <CardBody>
            <Tabs colorScheme="brand" isFitted>
              <TabList mb={4}>
                <Tab>Entrar</Tab>
                <Tab>Criar conta</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel>E-mail</FormLabel>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Senha</FormLabel>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} />
                    </FormControl>
                    <Button onClick={handleSignIn} isLoading={busy}>Entrar</Button>
                  </Stack>
                </TabPanel>
                <TabPanel px={0}>
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel>Nome completo</FormLabel>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>E-mail</FormLabel>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Senha</FormLabel>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </FormControl>
                    <Button onClick={handleSignUp} isLoading={busy}>Criar conta</Button>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Contas novas são de pacientes. O acesso à ficha depende de vínculo feito pela clínica.
                    </Text>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>

        <Center mt={4}>
          <Link as={RouterLink} to="/agendar" color="brand.600" fontWeight="medium">
            Quero agendar sem cadastro →
          </Link>
        </Center>
      </Box>
    </Center>
  );
}
