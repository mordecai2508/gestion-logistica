import { useQuery } from '@tanstack/react-query';
import { notificacionService } from '@/services/notificacionService';
import type { NotificacionFilters } from '@/services/notificacionService';

export const useNotificaciones = (filters: NotificacionFilters = {}) => {
  return useQuery({
    queryKey: ['notificaciones', filters],
    queryFn: () => notificacionService.listar(filters),
  });
};
