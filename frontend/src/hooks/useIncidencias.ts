import { useQuery } from '@tanstack/react-query';
import { incidenciaService } from '@/services/incidenciaService';
import type { IncidenciaFilters } from '@/types/incidenciaTypes';

export const useIncidencias = (filters: IncidenciaFilters) => {
  return useQuery({
    queryKey: ['incidencias', filters],
    queryFn: () => incidenciaService.listar(filters),
  });
};
