import { Box, Card, CardBody, Text, Stack, HStack, Badge, SimpleGrid, Wrap, WrapItem, Image, Link, Icon, Heading, Button } from '@chakra-ui/react';
import { FiChevronLeft, FiFileText } from 'react-icons/fi';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Loading, EmptyState, TreatmentStatusBadge } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export default function PortalTreatmentDetail() {
  const { id } = useParams();
  
  const { data, isLoading } = useQuery({
    queryKey: ['portal-treatment', id],
    queryFn: () => api<any>(`/portal/treatments/${id}`),
    retry: false,
  });

  if (isLoading) return <Loading />;
  if (!data) return <Text color="red.500">Tratamento não encontrado.</Text>;

  const t = data;
  const stages = t.stages || [];
  const consultations = t.consultations || [];

  return (
    <Stack spacing={5}>
      <Button as={RouterLink} to="/portal" variant="ghost" leftIcon={<FiChevronLeft />} w="fit-content">
        Voltar
      </Button>

      <Card>
        <CardBody>
          <HStack justify="space-between" mb={2}>
            <Heading size="md">{t.title}</Heading>
            <TreatmentStatusBadge status={t.status} />
          </HStack>
          {t.diagnosis && <Text color="gray.600" mb={4}>{t.diagnosis}</Text>}
          <Text fontSize="sm" color="gray.500">Início: {fmtDate(t.start_date)}</Text>
        </CardBody>
      </Card>

      <Box>
        <Heading size="sm" mb={3}>Evoluções do Tratamento</Heading>
        {consultations.length === 0 ? (
          <Card><CardBody><EmptyState icon={FiFileText} title="Sem evoluções" description="Ainda não há registros de evolução neste tratamento." /></CardBody></Card>
        ) : (
          <Stack spacing={3}>
            {consultations.map((c: any) => (
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
                      {c.attachments.map((a: any) => (
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
        )}
      </Box>
    </Stack>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box>
      <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">{label}</Text>
      <Text fontSize="sm">{value}</Text>
    </Box>
  );
}
