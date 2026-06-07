import { PrismaClient, Prisma, Vehiculo, EstadoVehiculo } from '@prisma/client';

const prisma = new PrismaClient();

export const vehiculoRepository = {
  async crear(data: Prisma.VehiculoCreateInput): Promise<Vehiculo> {
    return prisma.vehiculo.create({ data });
  },

  async findByPlaca(placa: string): Promise<Vehiculo | null> {
    return prisma.vehiculo.findUnique({ where: { placa } });
  },

  async findById(id: string): Promise<Vehiculo | null> {
    return prisma.vehiculo.findUnique({ where: { id } });
  },

  async findAll(filters: { estado?: EstadoVehiculo }): Promise<Vehiculo[]> {
    const where: Prisma.VehiculoWhereInput = {};
    if (filters.estado !== undefined) {
      where.estado = filters.estado;
    }

    return prisma.vehiculo.findMany({
      where,
      orderBy: { placa: 'asc' },
    });
  },

  async actualizarEstado(id: string, estado: EstadoVehiculo): Promise<Vehiculo> {
    return prisma.vehiculo.update({
      where: { id },
      data: { estado },
    });
  },
};
