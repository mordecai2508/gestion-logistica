import { useQuery } from '@tanstack/react-query';
import { vehiculoService } from '@/services/vehiculoService';
import type { VehiculoFiltros } from '@/types/vehiculoTypes';

export const useVehiculos = (filters: VehiculoFiltros = {}) => {
  return useQuery({
    queryKey: ['vehiculos', filters],
    queryFn: () => vehiculoService.listar(filters),
  });
};
