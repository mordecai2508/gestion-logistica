import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionService } from '@/services/notificacionService';
import type { NotificacionDto, PaginatedNotificacionesResponse } from '@/types/notificacionTypes';

export const useMarcarNotificacionLeida = (filters: { page?: number; limit?: number } = {}) => {
  const queryClient = useQueryClient();

  return useMutation<NotificacionDto, Error, string>({
    mutationFn: (id: string) => notificacionService.marcarComoLeida(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedNotificacionesResponse>(
        ['notificaciones', filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((n) => (n.id === updated.id ? updated : n)),
          };
        },
      );
    },
  });
};
