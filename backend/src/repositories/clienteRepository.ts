import { PrismaClient, Cliente } from '@prisma/client';

const prisma = new PrismaClient();

export const clienteRepository = {
  async findById(id: string): Promise<Cliente | null> {
    return prisma.cliente.findUnique({ where: { id } });
  },

  async search(query: string): Promise<Array<{ id: string; usuario: { nombre: string; correo: string } }>> {
    return prisma.cliente.findMany({
      where: {
        usuario: {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' } },
            { correo: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      take: 10,
      select: {
        id: true,
        usuario: { select: { nombre: true, correo: true } },
      },
    });
  },
};
