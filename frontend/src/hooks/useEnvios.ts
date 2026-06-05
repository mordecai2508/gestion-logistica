import { useQuery } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';
import type { EnvioFilters } from '@/types/envioTypes';

export const useEnvios = (filters: EnvioFilters) => {
  return useQuery({
    queryKey: ['envios', filters],
    queryFn: () => envioService.listar(filters),
  });
};
