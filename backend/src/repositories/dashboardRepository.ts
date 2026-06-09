import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dashboardRepository = {
  async getMetrics(): Promise<{
    totalEnvios: number;
    enRuta: number;
    entregados: number;
    incidenciasAbiertas: number;
  }> {
    const [totalEnvios, enRuta, entregados, incidenciasAbiertas] = await Promise.all([
      prisma.envio.count(),
      prisma.envio.count({ where: { estado: 'EN_RUTA' } }),
      prisma.envio.count({ where: { estado: 'ENTREGADO' } }),
      prisma.incidencia.count({ where: { estado: 'ABIERTA' } }),
    ]);
    return { totalEnvios, enRuta, entregados, incidenciasAbiertas };
  },

  async getEnviosRecientes(): Promise<
    Array<{
      codigoSeguimiento: string;
      estado: string;
      createdAt: Date;
      cliente: { usuario: { nombre: string } };
    }>
  > {
    return prisma.envio.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        codigoSeguimiento: true,
        estado: true,
        createdAt: true,
        cliente: {
          select: {
            usuario: { select: { nombre: true } },
          },
        },
      },
    });
  },

  async getRutasPendientes(): Promise<
    Array<{
      id: string;
      codigo: string;
      nombre: string | null;
      createdAt: Date;
    }>
  > {
    return prisma.ruta.findMany({
      take: 5,
      where: { estado: 'PENDIENTE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, codigo: true, nombre: true, createdAt: true },
    });
  },

  async getVehiculosDisponibles(): Promise<
    Array<{
      id: string;
      placa: string;
      modelo: string;
      estado: string;
    }>
  > {
    return prisma.vehiculo.findMany({
      take: 5,
      where: { estado: 'DISPONIBLE' },
      orderBy: { placa: 'asc' },
      select: { id: true, placa: true, modelo: true, estado: true },
    });
  },
};
