import { PrismaClient, Incidencia, Prisma, EstadoIncidencia, Envio } from '@prisma/client';
import { CrearIncidenciaDto } from '../types/incidenciaTypes';

const prisma = new PrismaClient();

const incidenciaConEnvioInclude = {
  envio: { select: { codigoSeguimiento: true } },
} satisfies Prisma.IncidenciaInclude;

export type IncidenciaConEnvio = Prisma.IncidenciaGetPayload<{
  include: typeof incidenciaConEnvioInclude;
}>;

export const incidenciaRepository = {
  async crear(data: CrearIncidenciaDto): Promise<Incidencia> {
    return prisma.incidencia.create({ data });
  },

  async findById(id: string): Promise<Incidencia | null> {
    return prisma.incidencia.findUnique({ where: { id } });
  },

  async findMany(
    where: Prisma.IncidenciaWhereInput,
    skip: number,
    take: number,
  ): Promise<IncidenciaConEnvio[]> {
    return prisma.incidencia.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: incidenciaConEnvioInclude,
    });
  },

  async count(where: Prisma.IncidenciaWhereInput): Promise<number> {
    return prisma.incidencia.count({ where });
  },

  async actualizarEstado(id: string, estado: EstadoIncidencia): Promise<Incidencia> {
    return prisma.incidencia.update({ where: { id }, data: { estado } });
  },

  /**
   * Resuelve una incidencia de tipo ENTREGA_FALLIDA y reactiva el envío
   * asociado (FALLIDO -> EN_RUTA), registrando el evento de reactivación en
   * el historial del envío, todo en una única transacción de base de datos
   * (mismo patrón que `entregaRepository.confirmarEntrega`/`registrarFallo`).
   */
  async resolverConReactivacionEnvio(
    incidenciaId: string,
    envioId: string,
  ): Promise<{ incidencia: Incidencia; envio: Envio }> {
    return prisma.$transaction(async (tx) => {
      const incidencia = await tx.incidencia.update({
        where: { id: incidenciaId },
        data: { estado: 'RESUELTA' },
      });
      const envio = await tx.envio.update({
        where: { id: envioId },
        data: { estado: 'EN_RUTA' },
      });
      await tx.eventoEnvio.create({
        data: {
          envioId,
          estado: 'EN_RUTA',
          descripcion: 'Entrega reactivada tras resolución de incidencia',
        },
      });
      return { incidencia, envio };
    });
  },
};
