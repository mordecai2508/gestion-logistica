import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const reportesRepository = {
  async getEnviosPorEstado(desde: Date, hasta: Date) {
    return prisma.envio.groupBy({
      by: ['estado'],
      where: { createdAt: { gte: desde, lte: hasta } },
      _count: { _all: true },
    });
  },

  async getEnviosFechas(
    desde: Date,
    hasta: Date,
  ): Promise<Array<{ createdAt: Date }>> {
    return prisma.envio.findMany({
      where: { createdAt: { gte: desde, lte: hasta } },
      select: { createdAt: true },
    });
  },

  async getEnviosParaCSV(
    desde: Date,
    hasta: Date,
  ): Promise<
    Array<{
      codigoSeguimiento: string;
      estado: string;
      remitente: string;
      destinatario: string;
      direccionDestino: string;
      createdAt: Date;
    }>
  > {
    return prisma.envio.findMany({
      where: { createdAt: { gte: desde, lte: hasta } },
      select: {
        codigoSeguimiento: true,
        estado: true,
        remitente: true,
        destinatario: true,
        direccionDestino: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getRepartidoresConEnvios(): Promise<
    Array<{
      id: string;
      usuario: { nombre: string };
      rutas: Array<{ envios: Array<{ estado: string }> }>;
    }>
  > {
    return prisma.repartidor.findMany({
      include: {
        usuario: { select: { nombre: true } },
        rutas: {
          include: {
            envios: { select: { estado: true } },
          },
        },
      },
    });
  },
};
