import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Box, Flex, HStack, VStack, Icon, Text, IconButton, Drawer, DrawerBody, DrawerContent,
  DrawerOverlay, useDisclosure, Avatar, Menu, MenuButton, MenuList, MenuItem, Spacer, useBreakpointValue,
  Image, useColorMode, useColorModeValue
} from '@chakra-ui/react';
import {
  FiHome, FiUsers, FiCalendar, FiClock, FiActivity, FiSettings, FiMenu, FiLogOut, FiChevronDown, FiSun, FiMoon
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuth } from '../context/AuthContext';

interface NavItem { to: string; label: string; icon: IconType; end?: boolean }

const NAV: NavItem[] = [
  { to: '/app', label: 'Painel', icon: FiHome, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: FiCalendar },
  { to: '/app/pacientes', label: 'Pacientes', icon: FiUsers },
  { to: '/app/servicos', label: 'Serviços', icon: FiActivity },
  { to: '/app/disponibilidade', label: 'Disponibilidade', icon: FiClock },
  { to: '/app/config', label: 'Configurações', icon: FiSettings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <VStack align="stretch" spacing={1}>
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}>
          {({ isActive }) => (
            <HStack
              px={4} py={3} borderRadius="lg" spacing={3}
              bg={isActive ? 'brand.500' : 'transparent'}
              color={isActive ? 'white' : 'gray.600'}
              _hover={{ bg: isActive ? 'brand.500' : 'brand.50' }}
              transition="all .15s"
            >
              <Icon as={item.icon} boxSize={5} />
              <Text fontWeight={isActive ? 'semibold' : 'medium'}>{item.label}</Text>
            </HStack>
          )}
        </NavLink>
      ))}
    </VStack>
  );
}

function ColorModeSwitcher() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Alternar tema"
      icon={<Icon as={colorMode === 'dark' ? FiSun : FiMoon} />}
      onClick={toggleColorMode}
      variant="ghost"
      mr={2}
    />
  );
}

function Brand() {
  return (
    <HStack px={4} py={2} spacing={3}>
      <Image src="/logo.webp" boxSize="40px" objectFit="contain" />
      <Box>
        <Text fontWeight="bold" lineHeight="1.1">FisioForme</Text>
        <Text fontSize="xs" color="gray.500">Gestão da clínica</Text>
      </Box>
    </HStack>
  );
}

export function AdminLayout() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Flex minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Sidebar desktop */}
      {isDesktop && (
        <Box as="nav" w="260px" bg={useColorModeValue('white', 'gray.800')} borderRight="1px solid" borderColor={useColorModeValue('gray.200', 'gray.700')} position="fixed" h="100vh" py={4}>
          <Brand />
          <Box mt={6} px={2}><NavItems /></Box>
        </Box>
      )}

      {/* Drawer mobile */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody p={0} pt={4}>
            <Brand />
            <Box mt={6} px={2}><NavItems onNavigate={onClose} /></Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box flex="1" minW={0} ml={{ base: 0, lg: '260px' }}>
        {/* Topbar */}
        <Flex as="header" bg={useColorModeValue('white', 'gray.800')} borderBottom="1px solid" borderColor={useColorModeValue('gray.200', 'gray.700')} px={4} py={3} align="center" position="sticky" top={0} zIndex={10}>
          {!isDesktop && (
            <IconButton aria-label="Menu" icon={<FiMenu />} variant="ghost" onClick={onOpen} mr={2} />
          )}
          {!isDesktop && <Text fontWeight="bold">FisioForme</Text>}
          <Spacer />
          <ColorModeSwitcher />
          <Menu>
            <MenuButton>
              <HStack spacing={2}>
                <Avatar size="sm" name={profile?.full_name} bg="brand.500" color="white" />
                <Box display={{ base: 'none', md: 'block' }} textAlign="left">
                  <Text fontSize="sm" fontWeight="medium" lineHeight="1.1">{profile?.full_name || 'Usuário'}</Text>
                  <Text fontSize="xs" color="gray.500">{profile?.role}</Text>
                </Box>
                <Icon as={FiChevronDown} color="gray.400" />
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FiLogOut />} onClick={handleSignOut}>Sair</MenuItem>
            </MenuList>
          </Menu>
        </Flex>

        <Box as="main" p={{ base: 4, md: 6 }} maxW="1200px" mx="auto">
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
