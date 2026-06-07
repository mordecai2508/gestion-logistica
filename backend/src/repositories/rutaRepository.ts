import { PrismaClient, Prisma, Envio, Vehiculo, Repartidor } from '@prisma/client';

const prisma = new PrismaClient();

const rutaInclude = {
  vehiculo: true,
  repartidor: {
    include: {
      usuario: true,
    },
  },
  envios: true,
} satisfies Prisma.RutaInclude;

export type RutaConRelaciones = Prisma.RutaGetPayload<{
  include: typeof rutaInclude;
}>;

export type RepartidorConUsuario = Prisma.RepartidorGetPayload<{
  include: { usuario: true };
}>;

export interface CrearRutaConTransaccionInput {
  codigo: string;
  repartidorId: string;
  vehiculoId: string;
  enviosIds: string[];
}

export interface ReasignarRutaConTransaccionInput {
  rutaId: string;
  repartidorId?: string;
  vehiculoId?: string;
  vehiculoAnteriorId: string;
}

export const rutaRepository = {
  async crear(data: Prisma.RutaCreateInput): Promise<RutaConRelaciones> {
    return prisma.ruta.create({
      data,
      include: rutaInclude,
    });
  },

  async findById(id: string): Promise<RutaConRelaciones | null> {
    return prisma.ruta.findUnique({
      where: { id },
      include: rutaInclude,
    });
  },

  async findAll(
    filters: { repartidorId?: string },
    skip: number,
    take: number,
  ): Promise<{ rutas: RutaConRelaciones[]; total: number }> {
    const where: Prisma.RutaWhereInput = {};
    if (filters.repartidorId !== undefined) {
      where.repartidorId = filters.repartidorId;
    }

    const [rutas, total] = await Promise.all([
      prisma.ruta.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: rutaInclude,
      }),
      prisma.ruta.count({ where }),
    ]);

    return { rutas, total };
  },

  async update(id: string, data: Prisma.RutaUpdateInput): Promise<RutaConRelaciones> {
    return prisma.ruta.update({
      where: { id },
      data,
      include: rutaInclude,
    });
  },

  async findByCodigo(codigo: string): Promise<RutaConRelaciones | null> {
    return prisma.ruta.findUnique({
      where: { codigo },
      include: rutaInclude,
    });
  },

  async findEnviosByIds(ids: string[]): Promise<Envio[]> {
    return prisma.envio.findMany({
      where: { id: { in: ids } },
    });
  },

  async findVehiculoById(id: string): Promise<Vehiculo | null> {
    return prisma.vehiculo.findUnique({ where: { id } });
  },

  async findRepartidorById(id: string): Promise<Repartidor | null> {
    return prisma.repartidor.findUnique({ where: { id } });
  },

  async findRepartidorByUsuarioId(usuarioId: string): Promise<Repartidor | null> {
    return prisma.repartidor.findFirst({ where: { usuarioId } });
  },

  /**
   * Crea la ruta, asigna los envíos (rutaId + estado EN_RUTA) y marca el
   * vehículo como EN_RUTA, todo en una única transacción de base de datos.
   */
  async crearConTransaccion(input: CrearRutaConTransaccionInput): Promise<RutaConRelaciones> {
    return prisma.$transaction(async (tx) => {
      const nuevaRuta = await tx.ruta.create({
        data: {
          codigo: input.codigo,
          repartidorId: input.repartidorId,
          vehiculoId: input.vehiculoId,
        },
      });

      await tx.envio.updateMany({
        where: { id: { in: input.enviosIds } },
        data: { rutaId: nuevaRuta.id, estado: 'EN_RUTA' },
      });

      await tx.vehiculo.update({
        where: { id: input.vehiculoId },
        data: { estado: 'EN_RUTA' },
      });

      return tx.ruta.findUniqueOrThrow({
        where: { id: nuevaRuta.id },
        include: rutaInclude,
      });
    });
  },

  /**
   * Aplica la reasignación de repartidor y/o vehículo de una ruta. Si cambia
   * el vehículo, revierte el anterior a DISPONIBLE y marca el nuevo como
   * EN_RUTA. Todo en una única transacción de base de datos.
   */
  async reasignarConTransaccion(input: ReasignarRutaConTransaccionInput): Promise<RutaConRelaciones> {
    return prisma.$transaction(async (tx) => {
      if (input.vehiculoId !== undefined && input.vehiculoId !== input.vehiculoAnteriorId) {
        await tx.vehiculo.update({
          where: { id: input.vehiculoAnteriorId },
          data: { estado: 'DISPONIBLE' },
        });
        await tx.vehiculo.update({
          where: { id: input.vehiculoId },
          data: { estado: 'EN_RUTA' },
        });
      }

      const updateData: Prisma.RutaUpdateInput = {};
      if (input.repartidorId !== undefined) {
        updateData.repartidor = { connect: { id: input.repartidorId } };
      }
      if (input.vehiculoId !== undefined) {
        updateData.vehiculo = { connect: { id: input.vehiculoId } };
      }

      return tx.ruta.update({
        where: { id: input.rutaId },
        data: updateData,
        include: rutaInclude,
      });
    });
  },

  /**
   * Marca la ruta como COMPLETADA y libera el vehículo asignado
   * (estado DISPONIBLE), todo en una única transacción de base de datos.
   */
  async cerrarRutaConTransaccion(rutaId: string, vehiculoId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.ruta.update({
        where: { id: rutaId },
        data: { estado: 'COMPLETADA' },
      });
      await tx.vehiculo.update({
        where: { id: vehiculoId },
        data: { estado: 'DISPONIBLE' },
      });
    });
  },
};
