import { useMutation, useQueryClient } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';
import type { CrearEnvioDto, EnvioResponseDto } from '@/types/envioTypes';

export const useCrearEnvio = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<EnvioResponseDto, Error, CrearEnvioDto>({
    mutationFn: (dto: CrearEnvioDto) => envioService.crear(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['envios'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
};
