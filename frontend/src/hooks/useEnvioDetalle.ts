import { useQuery } from '@tanstack/react-query';
import { envioService } from '@/services/envioService';

export const useEnvioDetalle = (id: string) => {
  return useQuery({
    queryKey: ['envios', id],
    queryFn: () => envioService.obtenerDetalle(id),
    enabled: !!id,
  });
};
