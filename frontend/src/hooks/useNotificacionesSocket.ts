import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '@/lib/socket';
import type { NotificationNewPayload, PaginatedNotificacionesResponse } from '@/types/notificacionTypes';

export const useNotificacionesSocket = (filters: { page?: number; limit?: number } = {}): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewNotificacion = (payload: NotificationNewPayload) => {
      queryClient.setQueryData<PaginatedNotificacionesResponse>(
        ['notificaciones', filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [payload, ...old.data],
            meta: {
              ...old.meta,
              total: old.meta.total + 1,
            },
          };
        },
      );
    };

    socket.on('notification:new', handleNewNotificacion);

    return () => {
      socket.off('notification:new', handleNewNotificacion);
    };
    // filters is excluded intentionally: socket subscription runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);
};
