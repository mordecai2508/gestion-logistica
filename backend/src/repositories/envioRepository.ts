import { PrismaClient, Envio, Prisma, EstadoEnvio } from '@prisma/client';
import { CrearEnvioDto, EditarEnvioDto } from '../types/envioTypes';

const prisma = new PrismaClient();

export type EnvioConCliente = Prisma.EnvioGetPayload<{
  include: { cliente: { include: { usuario: true } } };
}>;

export type EnvioConDetalle = Prisma.EnvioGetPayload<{
  include: {
    eventos: { orderBy: { timestamp: 'asc' } };
    cliente: { include: { usuario: true } };
  };
}>;

export const envioRepository = {
  async createEnvio(data: CrearEnvioDto & { codigoSeguimiento: string }): Promise<Envio> {
    return prisma.$transaction(async (tx) => {
      const envio = await tx.envio.create({
        data: {
          codigoSeguimiento: data.codigoSeguimiento,
          remitente: data.remitente,
          destinatario: data.destinatario,
          direccionDestino: data.direccionDestino,
          peso: data.peso,
          dimensiones: data.dimensiones,
          descripcion: data.descripcion,
          clienteId: data.clienteId,
        },
      });

      await tx.eventoEnvio.create({
        data: {
          envioId: envio.id,
          estado: 'PENDIENTE',
          descripcion: 'Envío creado',
        },
      });

      return envio;
    });
  },

  async findByCodigo(codigo: string): Promise<Envio | null> {
    return prisma.envio.findUnique({ where: { codigoSeguimiento: codigo } });
  },

  async findMany(
    where: Prisma.EnvioWhereInput,
    skip: number,
    take: number,
  ): Promise<EnvioConCliente[]> {
    return prisma.envio.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { include: { usuario: true } } },
    });
  },

  async count(where: Prisma.EnvioWhereInput): Promise<number> {
    return prisma.envio.count({ where });
  },

  async findById(id: string): Promise<EnvioConDetalle | null> {
    return prisma.envio.findUnique({
      where: { id },
      include: {
        eventos: { orderBy: { timestamp: 'asc' } },
        cliente: { include: { usuario: true } },
      },
    });
  },

  async update(id: string, data: EditarEnvioDto): Promise<Envio> {
    return prisma.envio.update({ where: { id }, data });
  },

  async cancelar(id: string): Promise<Envio> {
    const [envio] = await prisma.$transaction([
      prisma.envio.update({ where: { id }, data: { estado: 'CANCELADO' } }),
      prisma.eventoEnvio.create({
        data: {
          envioId: id,
          estado: 'CANCELADO',
          descripcion: 'Envío cancelado por operador',
        },
      }),
    ]);
    return envio;
  },

  /**
   * Registra la nueva fecha de reprogramación del envío y documenta el cambio
   * en su historial de eventos, todo en una única transacción de base de
   * datos (mismo patrón que `entregaRepository.confirmarEntrega`/`registrarFallo`).
   * No modifica `Envio.estado`.
   */
  async findManyByClienteId(params: {
    clienteId: string;
    estado?: EstadoEnvio;
    skip: number;
    take: number;
  }): Promise<{ envios: Envio[]; total: number }> {
    const where: Prisma.EnvioWhereInput = { clienteId: params.clienteId };
    if (params.estado !== undefined) {
      where.estado = params.estado;
    }
    const [envios, total] = await Promise.all([
      prisma.envio.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.envio.count({ where }),
    ]);
    return { envios, total };
  },

  async reprogramar(
    id: string,
    data: { fechaReprogramacion: Date; descripcionEvento: string },
  ): Promise<Envio> {
    return prisma.$transaction(async (tx) => {
      const envio = await tx.envio.update({
        where: { id },
        data: { fechaReprogramacion: data.fechaReprogramacion },
      });
      await tx.eventoEnvio.create({
        data: {
          envioId: id,
          estado: envio.estado,
          descripcion: data.descripcionEvento,
        },
      });
      return envio;
    });
  },
};
