import { useMutation, useQueryClient } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';
import type { EditarEnvioDto, EnvioResponseDto } from '@/types/envioTypes';

export const useEditarEnvio = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<EnvioResponseDto, Error, EditarEnvioDto>({
    mutationFn: (dto: EditarEnvioDto) => envioService.editar(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['envios'] });
    },
  });
};
