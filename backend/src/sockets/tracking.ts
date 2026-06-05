import { Server, Socket } from 'socket.io';
import { locationUpdateSchema } from '../validators/trackingValidator';
import { envioRepository } from '../repositories/envioRepository';
import { trackingRepository } from '../repositories/trackingRepository';

export function registerTrackingHandlers(io: Server, socket: Socket): void {
  socket.on('location:update', async (payload: unknown) => {
    const parsed = locationUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('tracking:error', { message: 'Payload inválido' });
      return;
    }

    const { envioId, lat, lng } = parsed.data;

    const envio = await envioRepository.findById(envioId);
    if (envio === null) {
      socket.emit('tracking:error', { message: 'Envío no encontrado' });
      return;
    }

    await trackingRepository.createEventoUbicacion({
      envioId,
      estado: envio.estado,
      descripcion: 'Actualización de ubicación',
      lat,
      lng,
    });

    io.to(`tracking:${envioId}`).emit('tracking:location', {
      envioId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('tracking:join', (payload: unknown) => {
    const data = payload as { envioId?: string };
    if (data && typeof data.envioId === 'string') {
      void socket.join(`tracking:${data.envioId}`);
    }
  });

  socket.on('tracking:leave', (payload: unknown) => {
    const data = payload as { envioId?: string };
    if (data && typeof data.envioId === 'string') {
      void socket.leave(`tracking:${data.envioId}`);
    }
  });
}
