import { PrismaClient, Incidencia, Prisma, EstadoIncidencia } from '@prisma/client';
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
};
