import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  Button, useToast, Box, Text, FormControl, FormLabel, Input, Icon, Heading, VStack, useDisclosure
} from '@chakra-ui/react';
import { FiCheckCircle } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TimeSlot } from '@fisioforme/shared';
import { SlotPicker } from '../../components/SlotPicker';
import { api } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';

interface PortalBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortalBookingModal({ isOpen, onClose }: PortalBookingModalProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () => api('/portal/appointments', {
      method: 'POST',
      body: { service_type_id: serviceId, start_time: slot?.start, notes },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-me'] });
      setDone(true);
    },
    onError: (e: any) => {
      toast({ status: 'error', title: 'Não foi possível agendar', description: e.message });
    }
  });

  const submit = () => {
    if (!slot || !serviceId) { toast({ status: 'warning', title: 'Escolha um horário' }); return; }
    mut.mutate();
  };

  const resetAndClose = () => {
    setDone(false);
    setSlot(null);
    setServiceId('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} size={{ base: 'full', md: 'lg' }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{done ? 'Agendamento Confirmado' : 'Agendar Nova Consulta'}</ModalHeader>
        {!done && <ModalCloseButton />}
        <ModalBody pb={6}>
          {done ? (
            <VStack spacing={4} textAlign="center" py={8}>
              <Icon as={FiCheckCircle} boxSize={14} color="green.400" />
              <Heading size="md">Agendamento Realizado!</Heading>
              <Text color="gray.600">
                Seu agendamento para <b>{fmtDateTime(slot?.start)}</b> foi salvo com sucesso.
              </Text>
            </VStack>
          ) : (
            <Box>
              <Text color="gray.600" mb={6}>Selecione o serviço e o melhor horário para você.</Text>
              
              <SlotPicker 
                publicMode
                selectedStart={slot?.start} 
                onSelect={(s, svc) => { setSlot(s); setServiceId(svc); }}
              />
              
              <FormControl mt={6}>
                <FormLabel>Observações (opcional)</FormLabel>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma observação para esta consulta?" />
              </FormControl>
            </Box>
          )}
        </ModalBody>

        <ModalFooter>
          {done ? (
            <Button colorScheme="brand" onClick={resetAndClose} w="full">Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" mr={3} onClick={resetAndClose}>Cancelar</Button>
              <Button colorScheme="brand" isLoading={mut.isPending} onClick={submit}>Confirmar Agendamento</Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
