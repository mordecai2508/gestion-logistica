import { useQuery } from '@tanstack/react-query';
import { entregaService } from '@/services/entregaService';

export const useEntregas = () => {
  return useQuery({
    queryKey: ['entregas', 'me'],
    queryFn: () => entregaService.listarMisEntregas(),
  });
};
