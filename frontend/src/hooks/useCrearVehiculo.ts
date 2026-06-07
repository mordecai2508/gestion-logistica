import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiculoService } from '@/services/vehiculoService';
import type { CrearVehiculoDto } from '@/types/vehiculoTypes';

export const useCrearVehiculo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CrearVehiculoDto) => vehiculoService.crear(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
    },
  });
};
