import { PrismaClient, Prisma, Envio, EventoEnvio, Incidencia } from '@prisma/client';

const prisma = new PrismaClient();

const envioConRutaInclude = {
  ruta: true,
} satisfies Prisma.EnvioInclude;

export type EnvioConRuta = Prisma.EnvioGetPayload<{
  include: typeof envioConRutaInclude;
}>;

const envioConRutaYClienteInclude = {
  ruta: true,
  cliente: { include: { usuario: true } },
} satisfies Prisma.EnvioInclude;

export type EnvioConRutaYCliente = Prisma.EnvioGetPayload<{
  include: typeof envioConRutaYClienteInclude;
}>;

export interface ConfirmarEntregaData {
  evidenciaFoto: string;
  firma: string;
  descripcionEvento: string;
}

export interface RegistrarFalloData {
  nota: string;
  foto: string | null;
}

export const entregaRepository = {
  async findEnviosByRepartidorId(repartidorId: string): Promise<EnvioConRuta[]> {
    return prisma.envio.findMany({
      where: { ruta: { repartidorId } },
      include: envioConRutaInclude,
      orderBy: { updatedAt: 'desc' },
    });
  },

  async findEnvioConRutaYCliente(
    envioId: string,
  ): Promise<EnvioConRutaYCliente | null> {
    return prisma.envio.findUnique({
      where: { id: envioId },
      include: envioConRutaYClienteInclude,
    });
  },

  /**
   * Actualiza el envío a ENTREGADO (con foto/firma) y crea el EventoEnvio que
   * documenta la transición, todo en una única transacción de base de datos.
   */
  async confirmarEntrega(
    envioId: string,
    data: ConfirmarEntregaData,
  ): Promise<{ envio: Envio; evento: EventoEnvio }> {
    return prisma.$transaction(async (tx) => {
      const envio = await tx.envio.update({
        where: { id: envioId },
        data: {
          estado: 'ENTREGADO',
          evidenciaFoto: data.evidenciaFoto,
          firma: data.firma,
        },
      });
      const evento = await tx.eventoEnvio.create({
        data: {
          envioId,
          estado: 'ENTREGADO',
          descripcion: data.descripcionEvento,
        },
      });
      return { envio, evento };
    });
  },

  /**
   * Actualiza el envío a FALLIDO, crea el EventoEnvio del intento fallido y la
   * Incidencia ENTREGA_FALLIDA asociada, todo en una única transacción.
   */
  async registrarFallo(
    envioId: string,
    data: RegistrarFalloData,
  ): Promise<{ envio: Envio; incidencia: Incidencia }> {
    return prisma.$transaction(async (tx) => {
      const envio = await tx.envio.update({
        where: { id: envioId },
        data: { estado: 'FALLIDO' },
      });
      await tx.eventoEnvio.create({
        data: {
          envioId,
          estado: 'FALLIDO',
          descripcion: data.nota,
        },
      });
      const incidencia = await tx.incidencia.create({
        data: {
          envioId,
          tipo: 'ENTREGA_FALLIDA',
          descripcion: 'Intento de entrega fallido',
          nota: data.nota,
          foto: data.foto,
          estado: 'ABIERTA',
        },
      });
      return { envio, incidencia };
    });
  },

};
