import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rutaService } from '@/services/rutaService';
import type { CrearRutaDto } from '@/types/rutaTypes';

export const useCrearRuta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CrearRutaDto) => rutaService.crear(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rutas'] });
    },
  });
};
