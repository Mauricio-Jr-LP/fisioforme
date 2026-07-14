import { Box, Heading, Text, VStack, Divider, Button } from '@chakra-ui/react';
import type { Patient } from '@fisioforme/shared';
import { fmtDate } from '../lib/format';

export function WaiverTemplate({ patient }: { patient: Patient }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      <Button onClick={handlePrint} colorScheme="brand" mb={6} className="no-print">
        Imprimir / Gerar PDF
      </Button>

      <Box
        className="print-section"
        p={8}
        bg="white"
        color="black"
        borderWidth={1}
        borderRadius="md"
        sx={{
          '@media print': {
            borderWidth: 0,
            p: 0,
            'body *': { display: 'none' },
            '.print-section, .print-section *': { display: 'block' },
            '.print-section': { position: 'absolute', left: 0, top: 0, width: '100%' }
          }
        }}
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading size="lg" mb={2}>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</Heading>
            <Text fontSize="sm" color="gray.600">Para Tratamento Fisioterapêutico</Text>
          </Box>

          <Divider borderColor="gray.300" />

          <Box>
            <Text textAlign="justify" lineHeight="tall">
              Eu, <strong>{patient.full_name}</strong>, portador(a) do documento nº <strong>{patient.document || '________________________'}</strong>,
              nascido(a) em <strong>{patient.birth_date ? fmtDate(patient.birth_date) : '___/___/_____'}</strong>, declaro ter sido devidamente 
              esclarecido(a) de forma clara e acessível sobre os procedimentos fisioterapêuticos a serem realizados.
            </Text>
            
            <Text textAlign="justify" lineHeight="tall" mt={4}>
              Compreendo que a fisioterapia é uma ciência aplicada e que os resultados dependem não apenas da técnica profissional, 
              mas também da minha assiduidade às sessões e do estrito cumprimento das orientações domiciliares (exercícios, repouso, posturas).
            </Text>

            <Text textAlign="justify" lineHeight="tall" mt={4}>
              Autorizo o(a) fisioterapeuta responsável e sua equipe a realizarem as avaliações, testes e condutas terapêuticas necessárias 
              para o meu tratamento. Fui informado(a) sobre possíveis desconfortos temporários inerentes a certas manipulações ou exercícios, 
              bem como dos benefícios esperados.
            </Text>
          </Box>

          <Box mt={10}>
            <Text mb={8}>Assinatura do Paciente ou Responsável Legal:</Text>
            <Box borderBottom="1px solid black" w="80%" mb={2} />
            <Text fontSize="sm" color="gray.500">Assinado digitalmente via Gov.br ou Fisicamente</Text>
          </Box>

          <Box mt={6}>
            <Text>Local e Data:</Text>
            <Text mt={2}>_________________________, ____ de ________________ de 20___.</Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
