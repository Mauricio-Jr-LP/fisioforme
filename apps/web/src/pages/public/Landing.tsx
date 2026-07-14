import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Container, Flex, Heading, Text, SimpleGrid, Icon, HStack, Stack, Card, CardBody, Spacer, Link,
} from '@chakra-ui/react';
import { FiCalendar, FiActivity, FiClock, FiHeart, FiCheckCircle } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import type { ServiceType } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { fmtMoney } from '../../lib/format';

export default function Landing() {
  const { data: services } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => api<ServiceType[]>('/service-types', { auth: false }),
  });

  return (
    <Box>
      {/* Header */}
      <Flex as="header" px={{ base: 4, md: 8 }} py={4} align="center" bg="white" borderBottom="1px solid" borderColor="gray.100">
        <HStack spacing={3}>
          <Flex boxSize={9} bg="brand.500" color="white" borderRadius="lg" align="center" justify="center" fontWeight="bold">F</Flex>
          <Heading size="md">FisioForme</Heading>
        </HStack>
        <Spacer />
        <HStack>
          <Link as={RouterLink} to="/login" fontWeight="medium" display={{ base: 'none', sm: 'block' }}>Entrar</Link>
          <Button as={RouterLink} to="/agendar" size="sm">Agendar</Button>
        </HStack>
      </Flex>

      {/* Hero */}
      <Box bgGradient="linear(to-br, brand.500, brand.700)" color="white">
        <Container maxW="1100px" py={{ base: 12, md: 20 }} px={4}>
          <Stack maxW="640px" spacing={5}>
            <Heading size={{ base: 'xl', md: '2xl' }} lineHeight="1.1">
              Cuide do seu movimento com quem entende
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} opacity={0.9}>
              Fisioterapia personalizada, avaliação completa e acompanhamento de perto.
              Agende sua sessão em poucos cliques — sem burocracia.
            </Text>
            <HStack>
              <Button as={RouterLink} to="/agendar" size="lg" colorScheme="whiteAlpha" bg="white" color="brand.700" _hover={{ bg: 'gray.100' }} leftIcon={<FiCalendar />}>
                Agendar agora
              </Button>
            </HStack>
          </Stack>
        </Container>
      </Box>

      {/* Diferenciais */}
      <Container maxW="1100px" py={{ base: 10, md: 16 }} px={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          {[
            { icon: FiActivity, title: 'Avaliação completa', desc: 'Anamnese detalhada e plano de tratamento individualizado.' },
            { icon: FiClock, title: 'Horários flexíveis', desc: 'Escolha o melhor dia e horário conforme a disponibilidade real.' },
            { icon: FiHeart, title: 'Acompanhamento', desc: 'Evolução registrada a cada sessão, com acesso pelo portal.' },
          ].map((f) => (
            <Card key={f.title}>
              <CardBody>
                <Icon as={f.icon} boxSize={8} color="brand.500" mb={3} />
                <Heading size="sm" mb={2}>{f.title}</Heading>
                <Text color="gray.600" fontSize="sm">{f.desc}</Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* Serviços */}
      {services && services.length > 0 && (
        <Box bg="white" py={{ base: 10, md: 16 }}>
          <Container maxW="1100px" px={4}>
            <Heading size="lg" mb={2}>Nossos serviços</Heading>
            <Text color="gray.500" mb={8}>Escolha o atendimento ideal para você.</Text>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
              {services.map((s) => (
                <Card key={s.id} borderTop="4px solid" borderColor={s.color}>
                  <CardBody>
                    <Heading size="sm" mb={1}>{s.name}</Heading>
                    {s.description && <Text fontSize="sm" color="gray.600" mb={3}>{s.description}</Text>}
                    <HStack justify="space-between" mt={2}>
                      <HStack color="gray.500" fontSize="sm"><Icon as={FiClock} /><Text>{s.duration_minutes} min</Text></HStack>
                      <Text fontWeight="bold" color="brand.600">{fmtMoney(s.price)}</Text>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
            <Flex justify="center" mt={10}>
              <Button as={RouterLink} to="/agendar" size="lg" leftIcon={<FiCheckCircle />}>Agendar meu horário</Button>
            </Flex>
          </Container>
        </Box>
      )}

      <Box as="footer" py={8} textAlign="center" color="gray.500" fontSize="sm">
        © {new Date().getFullYear()} FisioForme · Sistema de gestão para clínicas de fisioterapia
      </Box>
    </Box>
  );
}
