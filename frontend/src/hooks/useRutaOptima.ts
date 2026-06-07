import { useQuery } from '@tanstack/react-query';
import { rutaService } from '@/services/rutaService';

export const useRutaOptima = (id: string) => {
  return useQuery({
    queryKey: ['rutas', id, 'optima'],
    queryFn: () => rutaService.obtenerOptima(id),
    enabled: false,
  });
};
