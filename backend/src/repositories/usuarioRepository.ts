import { PrismaClient, Prisma, Rol } from '@prisma/client';

const prisma = new PrismaClient();

const usuarioSelect = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  telefono: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioSeleccionado = Prisma.UsuarioGetPayload<{
  select: typeof usuarioSelect;
}>;

export const usuarioRepository = {
  async findAll(
    filters: { rol?: Rol },
    skip: number,
    take: number,
  ): Promise<{ usuarios: UsuarioSeleccionado[]; total: number }> {
    const where: Prisma.UsuarioWhereInput = {};
    if (filters.rol !== undefined) {
      where.rol = filters.rol;
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: usuarioSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.usuario.count({ where }),
    ]);

    return { usuarios, total };
  },

  async findById(id: string): Promise<UsuarioSeleccionado | null> {
    return prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
  },

  async actualizarEstado(id: string, activo: boolean): Promise<UsuarioSeleccionado> {
    return prisma.usuario.update({
      where: { id },
      data: { activo },
      select: usuarioSelect,
    });
  },
};
