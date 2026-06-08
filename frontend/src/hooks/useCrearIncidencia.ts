import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incidenciaService } from '@/services/incidenciaService';
import type { CrearIncidenciaDto, IncidenciaDto } from '@/types/incidenciaTypes';

export const useCrearIncidencia = () => {
  const queryClient = useQueryClient();

  return useMutation<IncidenciaDto, Error, CrearIncidenciaDto>({
    mutationFn: (dto: CrearIncidenciaDto) => incidenciaService.crear(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidencias'] });
      void queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] });
    },
  });
};
