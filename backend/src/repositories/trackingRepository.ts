import { PrismaClient, EventoEnvio, EstadoEnvio, Prisma } from '@prisma/client';
import { CreateEventoUbicacionDto } from '../types/trackingTypes';

const prisma = new PrismaClient();

export type EnvioConEventos = Prisma.EnvioGetPayload<{
  include: { eventos: { orderBy: { timestamp: 'asc' } } };
}>;

export const trackingRepository = {
  async findByCodigo(codigo: string): Promise<EnvioConEventos | null> {
    return prisma.envio.findUnique({
      where: { codigoSeguimiento: codigo },
      include: { eventos: { orderBy: { timestamp: 'asc' } } },
    });
  },

  async createEventoUbicacion(data: CreateEventoUbicacionDto): Promise<EventoEnvio> {
    return prisma.eventoEnvio.create({
      data: {
        envioId: data.envioId,
        estado: data.estado as EstadoEnvio,
        descripcion: data.descripcion,
        lat: data.lat,
        lng: data.lng,
      },
    });
  },
};
