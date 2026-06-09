import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type RepartidorConUsuario = Prisma.RepartidorGetPayload<{
  include: { usuario: true };
}>;

export const repartidorRepository = {
  async findAll(
    filters: { disponible?: boolean },
    skip: number,
    take: number,
  ): Promise<{ repartidores: RepartidorConUsuario[]; total: number }> {
    const where: Prisma.RepartidorWhereInput = {};
    if (filters.disponible !== undefined) {
      where.disponible = filters.disponible;
    }

    const [repartidores, total] = await Promise.all([
      prisma.repartidor.findMany({
        where,
        include: { usuario: true },
        orderBy: { usuario: { nombre: 'asc' } },
        skip,
        take,
      }),
      prisma.repartidor.count({ where }),
    ]);

    return { repartidores, total };
  },

  async findById(id: string): Promise<RepartidorConUsuario | null> {
    return prisma.repartidor.findUnique({
      where: { id },
      include: { usuario: true },
    });
  },

  async update(
    id: string,
    data: { disponible?: boolean; licencia?: string },
  ): Promise<RepartidorConUsuario> {
    return prisma.repartidor.update({
      where: { id },
      data,
      include: { usuario: true },
    });
  },
};
