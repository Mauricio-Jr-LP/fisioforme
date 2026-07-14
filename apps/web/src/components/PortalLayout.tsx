import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Box, Flex, HStack, Text, Button, Container, Icon } from '@chakra-ui/react';
import { FiUser, FiFileText, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export function PortalLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { to: '/portal', label: 'Minha ficha', icon: FiUser, end: true },
    { to: '/portal/consultas', label: 'Evoluções', icon: FiFileText },
  ];

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex bg="brand.500" color="white" px={4} py={3} align="center" justify="space-between">
        <Text fontWeight="bold">FisioForme · Portal</Text>
        <Button size="sm" variant="ghost" color="white" leftIcon={<FiLogOut />}
          _hover={{ bg: 'brand.600' }}
          onClick={async () => { await signOut(); navigate('/login'); }}>
          Sair
        </Button>
      </Flex>

      <Flex bg="white" borderBottom="1px solid" borderColor="gray.200" px={4} overflowX="auto">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {({ isActive }) => (
              <HStack px={4} py={3} spacing={2} borderBottom="3px solid"
                borderColor={isActive ? 'brand.500' : 'transparent'}
                color={isActive ? 'brand.600' : 'gray.600'} fontWeight="medium">
                <Icon as={t.icon} />
                <Text>{t.label}</Text>
              </HStack>
            )}
          </NavLink>
        ))}
      </Flex>

      <Container maxW="720px" py={6} px={4}>
        <Text color="gray.500" fontSize="sm" mb={4}>Olá, {profile?.full_name || 'paciente'} 👋</Text>
        <Outlet />
      </Container>
    </Box>
  );
}
