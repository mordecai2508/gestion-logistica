import { useMutation, useQueryClient } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';
import type { CancelarEnvioResponseDto } from '@/types/envioTypes';

export const useCancelarEnvio = () => {
  const queryClient = useQueryClient();

  return useMutation<CancelarEnvioResponseDto, Error, string>({
    mutationFn: (id: string) => envioService.cancelar(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['envios'] });
    },
  });
};
