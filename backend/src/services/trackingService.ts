import { trackingRepository } from '../repositories/trackingRepository';
import { AppError } from '../lib/appError';
import { TrackingResponseDto } from '../types/trackingTypes';

export const trackingService = {
  async getByCodigoSeguimiento(codigo: string): Promise<TrackingResponseDto> {
    const envio = await trackingRepository.findByCodigo(codigo);

    if (envio === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }

    const ultimaActualizacion =
      envio.eventos.length > 0
        ? envio.eventos[envio.eventos.length - 1].timestamp
        : envio.updatedAt;

    return {
      envioId: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
      remitente: envio.remitente,
      destinatario: envio.destinatario,
      direccionDestino: envio.direccionDestino,
      ultimaActualizacion,
      eventos: envio.eventos.map((ev) => ({
        id: ev.id,
        estado: ev.estado,
        descripcion: ev.descripcion,
        lat: ev.lat ?? null,
        lng: ev.lng ?? null,
        timestamp: ev.timestamp,
      })),
    };
  },
};
