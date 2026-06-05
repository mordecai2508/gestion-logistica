import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import type { TrackingLocationPayload } from '@/types/trackingTypes';

export const useTrackingSocket = (
  envioId: string | null,
  onLocation: (payload: TrackingLocationPayload) => void,
): void => {
  useEffect(() => {
    if (!envioId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('tracking:join', { envioId });
    socket.on('tracking:location', onLocation);

    return () => {
      socket.emit('tracking:leave', { envioId });
      socket.off('tracking:location', onLocation);
    };
    // onLocation is intentionally excluded: the socket subscription must only
    // re-run when envioId changes, not on every render (design spec §4.4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envioId]);
};
