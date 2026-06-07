import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiculoService } from '@/services/vehiculoService';
import type { EstadoVehiculo } from '@/types/vehiculoTypes';

export const useActualizarEstadoVehiculo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoVehiculo }) =>
      vehiculoService.actualizarEstado(id, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
    },
  });
};
