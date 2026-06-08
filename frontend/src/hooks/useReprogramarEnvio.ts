import { useMutation, useQueryClient } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';
import type { ReprogramarEnvioResponseDto } from '@/types/envioTypes';

interface ReprogramarEnvioVars {
  envioId: string;
  fechaReprogramacion: string;
}

export const useReprogramarEnvio = () => {
  const queryClient = useQueryClient();

  return useMutation<ReprogramarEnvioResponseDto, Error, ReprogramarEnvioVars>({
    mutationFn: ({ envioId, fechaReprogramacion }: ReprogramarEnvioVars) =>
      envioService.reprogramar(envioId, fechaReprogramacion),
    onSuccess: (_data, { envioId }) => {
      void queryClient.invalidateQueries({ queryKey: ['envios', 'detalle', envioId] });
      void queryClient.invalidateQueries({ queryKey: ['envios', envioId] });
    },
  });
};
