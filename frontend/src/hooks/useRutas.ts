import { useQuery } from '@tanstack/react-query';
import { rutaService } from '@/services/rutaService';
import type { RutaFilters } from '@/types/rutaTypes';

export const useRutas = (filters: RutaFilters = {}) => {
  return useQuery({
    queryKey: ['rutas', filters],
    queryFn: () => rutaService.listar(filters),
  });
};
