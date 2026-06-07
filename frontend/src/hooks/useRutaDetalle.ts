import { useQuery } from '@tanstack/react-query';
import { rutaService } from '@/services/rutaService';

export const useRutaDetalle = (id: string) => {
  return useQuery({
    queryKey: ['rutas', id],
    queryFn: () => rutaService.obtenerDetalle(id),
    enabled: !!id,
  });
};
