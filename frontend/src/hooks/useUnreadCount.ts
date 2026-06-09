import { useNotificaciones } from './useNotificaciones';
import { useNotificacionesSocket } from './useNotificacionesSocket';

export const useUnreadCount = (): { count: number } => {
  useNotificacionesSocket({});

  const { data } = useNotificaciones({ limit: 50 });

  const count = data?.data.filter((n) => !n.leida).length ?? 0;

  return { count };
};
