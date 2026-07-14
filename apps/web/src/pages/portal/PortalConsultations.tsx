import {
  Box, Card, CardBody, Text, Stack, HStack, Badge, SimpleGrid, Wrap, WrapItem, Image, Link, Icon, Heading,
} from '@chakra-ui/react';
import { FiFileText } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import type { Consultation } from '@fisioforme/shared';
import { api } from '../../lib/api';
import { Loading, EmptyState } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export default function PortalConsultations() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-consultations'],
    queryFn: () => api<Consultation[]>('/portal/consultations'),
    retry: false,
  });

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) {
    return <Card><CardBody><EmptyState icon={FiFileText} title="Sem evoluções" description="Ainda não há registros de evolução." /></CardBody></Card>;
  }

  return (
    <Stack spacing={4}>
      <Heading size="sm">Histórico de evoluções</Heading>
      {data.map((c) => (
        <Card key={c.id}>
          <CardBody>
            <HStack mb={2}>
              <Text fontWeight="semibold">{fmtDate(c.date)}</Text>
              {c.pain_level != null && <Badge colorScheme={c.pain_level >= 7 ? 'red' : c.pain_level >= 4 ? 'orange' : 'green'}>Dor {c.pain_level}/10</Badge>}
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              <Field label="Relato" value={c.subjective} />
              <Field label="Avaliação física" value={c.objective} />
              <Field label="Análise" value={c.assessment} />
              <Field label="Conduta" value={c.plan} />
            </SimpleGrid>
            {c.attachments && c.attachments.length > 0 && (
              <Wrap mt={3}>
                {c.attachments.map((a) => (
                  <WrapItem key={a.id}>
                    {a.file_type?.startsWith('image/') && a.file_url ? (
                      <Link href={a.file_url} isExternal><Image src={a.file_url} boxSize="80px" objectFit="cover" borderRadius="md" alt={a.file_name} /></Link>
                    ) : (
                      <Link href={a.file_url || '#'} isExternal><Badge p={2}><Icon as={FiFileText} mr={1} />{a.file_name}</Badge></Link>
                    )}
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </CardBody>
        </Card>
      ))}
    </Stack>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <Box><Text fontSize="xs" fontWeight="bold" color="gray.500">{label}</Text><Text fontSize="sm" whiteSpace="pre-wrap">{value}</Text></Box>;
}
