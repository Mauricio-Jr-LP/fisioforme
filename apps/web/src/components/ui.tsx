import type { ReactNode } from 'react';
import {
  Box, Flex, Heading, Text, HStack, Icon, Badge, Card, CardBody, Center, Spinner,
} from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import {
  APPOINTMENT_STATUS_LABELS, TREATMENT_STATUS_LABELS, STAGE_STATUS_LABELS,
} from '@fisioforme/shared';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Flex mb={6} align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
      <Box>
        <Heading size="lg">{title}</Heading>
        {subtitle && <Text color="gray.500" mt={1}>{subtitle}</Text>}
      </Box>
      {action && <Box ml={{ md: 'auto' }} w={{ base: 'full', md: 'auto' }}>{action}</Box>}
    </Flex>
  );
}

export function StatCard({ label, value, icon, color = 'brand.500' }: { label: string; value: ReactNode; icon: IconType; color?: string }) {
  return (
    <Card>
      <CardBody>
        <HStack spacing={4}>
          <Flex boxSize={12} bg={`${color.split('.')[0]}.50`} borderRadius="lg" align="center" justify="center">
            <Icon as={icon} boxSize={6} color={color} />
          </Flex>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="1">{value}</Text>
            <Text fontSize="sm" color="gray.500">{label}</Text>
          </Box>
        </HStack>
      </CardBody>
    </Card>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: IconType; title: string; description?: string; action?: ReactNode }) {
  return (
    <Center flexDirection="column" py={12} px={4} textAlign="center">
      {icon && <Icon as={icon} boxSize={10} color="gray.300" mb={3} />}
      <Text fontWeight="semibold" color="gray.600">{title}</Text>
      {description && <Text color="gray.400" fontSize="sm" mt={1} maxW="sm">{description}</Text>}
      {action && <Box mt={4}>{action}</Box>}
    </Center>
  );
}

export function Loading() {
  return <Center py={16}><Spinner size="lg" color="brand.500" thickness="3px" /></Center>;
}

const APPT_COLORS: Record<string, string> = {
  pending: 'yellow', confirmed: 'blue', completed: 'green', cancelled: 'red', no_show: 'orange',
};
export function AppointmentStatusBadge({ status }: { status: keyof typeof APPOINTMENT_STATUS_LABELS }) {
  return <Badge colorScheme={APPT_COLORS[status] || 'gray'} borderRadius="full" px={2}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}

const TREAT_COLORS: Record<string, string> = { active: 'green', paused: 'yellow', completed: 'blue', cancelled: 'red' };
export function TreatmentStatusBadge({ status }: { status: keyof typeof TREATMENT_STATUS_LABELS }) {
  return <Badge colorScheme={TREAT_COLORS[status] || 'gray'} borderRadius="full" px={2}>{TREATMENT_STATUS_LABELS[status]}</Badge>;
}

const STAGE_COLORS: Record<string, string> = { pending: 'gray', in_progress: 'blue', completed: 'green', skipped: 'orange' };
export function StageStatusBadge({ status }: { status: keyof typeof STAGE_STATUS_LABELS }) {
  return <Badge colorScheme={STAGE_COLORS[status] || 'gray'} borderRadius="full" px={2}>{STAGE_STATUS_LABELS[status]}</Badge>;
}
