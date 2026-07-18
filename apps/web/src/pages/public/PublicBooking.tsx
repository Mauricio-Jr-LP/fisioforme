import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardBody, Container, Flex, FormControl, FormLabel, Heading, HStack, Input,
  Stack, Text, useToast, Icon, Link, Divider, IconButton, useColorMode, Spacer
} from '@chakra-ui/react';
import { FiCheckCircle, FiArrowLeft, FiSun, FiMoon } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import type { TimeSlot } from '@fisioforme/shared';
import { SlotPicker } from '../../components/SlotPicker';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmtDateTime } from '../../lib/format';

export default function PublicBooking() {
  const toast = useToast();
  const { session, profile } = useAuth();
  
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();

  const { data: services } = useQuery({
    queryKey: ['services', true],
    queryFn: () => api<any[]>('/service-types', { auth: false }),
  });
  const selectedService = services?.find(s => s.id === serviceId);
  const prepayValue = selectedService?.price ? selectedService.price * 0.3 : 0;

  const submit = async () => {
    if (!slot || !serviceId) { toast({ status: 'warning', title: 'Escolha um horário' }); return; }
    if (!name || !email || !phone) { toast({ status: 'warning', title: 'Preencha seus dados de contato' }); return; }
    setBusy(true);
    try {
      await api('/public/bookings', {
        auth: false,
        method: 'POST',
        body: { service_type_id: serviceId, start_time: slot.start, guest_name: name, guest_email: email, guest_phone: phone, notes },
      });
      setDone(true);
    } catch (e: any) {
      toast({ status: 'error', title: 'Não foi possível agendar', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  // Puxar a chave pix das configurações
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api<any>('/settings', { auth: false }).catch(() => ({})), // Falha silenciosa se rota não for pública
  });
  
  const pixKey = settings?.pix_key || "CNPJ ou Telefone da Clínica (solicite via WhatsApp)";

  if (done) {
    if (prepayValue > 0) {
      return (
        <Container maxW="520px" py={16} px={4}>
          <Card>
            <CardBody textAlign="center" py={10}>
              <Icon as={FiCheckCircle} boxSize={14} color="green.400" mb={4} />
              <Heading size="md" mb={2}>Agendamento Reservado!</Heading>
              <Text color="gray.600" mb={6}>
                Para confirmar seu agendamento para <b>{fmtDateTime(slot?.start)}</b>, é necessário realizar o pagamento de 30% do valor do serviço como sinal.
              </Text>
              
              <Box bg="gray.50" _dark={{ bg: 'gray.700', borderColor: 'gray.600' }} p={4} borderRadius="md" mb={6} borderWidth={1}>
                <Text fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>Valor do sinal (30%)</Text>
                <Heading size="lg" color="brand.600" mb={4}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prepayValue)}
                </Heading>
                
                <FormControl mb={2}>
                  <FormLabel fontSize="sm" textAlign="center">Chave Pix</FormLabel>
                  <Input value={pixKey} isReadOnly textAlign="center" bg="white" _dark={{ bg: 'gray.800' }} />
                </FormControl>
                <Text fontSize="xs" color="gray.400">
                  Transfira o valor acima e envie o comprovante para o nosso WhatsApp informando seu nome ({name}).
                </Text>
              </Box>

              <Button as={RouterLink} to="/" variant="outline">Voltar ao início</Button>
            </CardBody>
          </Card>
        </Container>
      );
    }

    return (
      <Container maxW="520px" py={16} px={4}>
        <Card>
          <CardBody textAlign="center" py={10}>
            <Icon as={FiCheckCircle} boxSize={14} color="green.400" mb={4} />
            <Heading size="md" mb={2}>Solicitação enviada!</Heading>
            <Text color="gray.600">
              Recebemos seu pedido para <b>{fmtDateTime(slot?.start)}</b>. Entraremos em contato pelo
              telefone <b>{phone}</b> para confirmar. Obrigado!
            </Text>
            <Button as={RouterLink} to="/" mt={6} variant="outline">Voltar ao início</Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Box bg="gray.50" _dark={{ bg: 'gray.900' }} minH="100vh">
      <Container maxW="640px" py={{ base: 6, md: 10 }} px={4}>
        <Flex mb={4} align="center">
          <Link as={RouterLink} to="/" color="gray.500" display="inline-flex" alignItems="center">
            <Icon as={FiArrowLeft} mr={1} /> Início
          </Link>
          <Spacer />
          <IconButton aria-label="Alterar tema" icon={colorMode === 'light' ? <FiMoon /> : <FiSun />} onClick={toggleColorMode} variant="ghost" size="sm" />
        </Flex>
        <Heading size="lg" mb={1}>Agende sua consulta</Heading>
        <Text color="gray.500" mb={6}>Escolha o serviço, o horário e informe seus dados de contato.</Text>

        <Card mb={4}>
          <CardBody>
            <SlotPicker
              publicMode
              selectedStart={slot?.start}
              onSelect={(s, svc) => { setSlot(s); setServiceId(svc); }}
            />
          </CardBody>
        </Card>

        {slot && (
          <Card>
            <CardBody>
              <HStack mb={4} color="brand.600">
                <Icon as={FiCheckCircle} />
                <Text fontWeight="semibold">Horário escolhido: {fmtDateTime(slot.start)}</Text>
              </HStack>
              <Divider mb={4} />
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nome completo</FormLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </FormControl>
                <HStack align="start" flexDir={{ base: 'column', sm: 'row' }} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>E-mail</FormLabel>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Telefone / WhatsApp</FormLabel>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: queixa principal, convênio..." />
                </FormControl>
                <Button size="lg" onClick={submit} isLoading={busy} leftIcon={<FiCheckCircle />}>
                  Confirmar solicitação
                </Button>
              </Stack>
            </CardBody>
          </Card>
        )}
      </Container>
    </Box>
  );
}
