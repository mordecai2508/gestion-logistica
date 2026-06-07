import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rutaService } from '@/services/rutaService';
import type { ReasignarRutaDto } from '@/types/rutaTypes';

export const useReasignarRuta = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ReasignarRutaDto) => rutaService.reasignar(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rutas', id] });
      void queryClient.invalidateQueries({ queryKey: ['rutas'] });
    },
  });
};
