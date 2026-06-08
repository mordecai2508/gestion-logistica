import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incidenciaService } from '@/services/incidenciaService';
import type { EstadoIncidencia, IncidenciaDto } from '@/types/incidenciaTypes';

interface ActualizarEstadoIncidenciaVars {
  id: string;
  estado: EstadoIncidencia;
}

export const useActualizarEstadoIncidencia = () => {
  const queryClient = useQueryClient();

  return useMutation<IncidenciaDto, Error, ActualizarEstadoIncidenciaVars>({
    mutationFn: ({ id, estado }: ActualizarEstadoIncidenciaVars) =>
      incidenciaService.actualizarEstado(id, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidencias'] });
    },
  });
};
