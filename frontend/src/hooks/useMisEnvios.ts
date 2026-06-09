import { useQuery } from '@tanstack/react-query';
import { clienteService } from '@/services/clienteService';
import type { MisEnviosFilters } from '@/types/misEnviosTypes';

export const useMisEnvios = (filters: MisEnviosFilters) => {
  return useQuery({
    queryKey: ['mis-envios', filters],
    queryFn: () => clienteService.listarMisEnvios(filters),
  });
};
