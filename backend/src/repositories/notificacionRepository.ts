import { PrismaClient } from '@prisma/client';
import type { TipoNotificacion } from '../types/notificacionTypes';

const prisma = new PrismaClient();

export interface CrearNotificacionData {
  usuarioId: string;
  envioId?: string;
  mensaje: string;
  tipo: TipoNotificacion;
}

export interface NotificacionRecord {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  usuarioId: string;
  envioId: string | null;
  createdAt: Date;
}

export const notificacionRepository = {
  async crear(data: CrearNotificacionData): Promise<NotificacionRecord> {
    return prisma.notificacion.create({
      data: {
        usuarioId: data.usuarioId,
        envioId: data.envioId,
        mensaje: data.mensaje,
        tipo: data.tipo,
      },
    }) as Promise<NotificacionRecord>;
  },

  async findManyByUsuario(
    usuarioId: string,
    skip: number,
    limit: number,
  ): Promise<NotificacionRecord[]> {
    return prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }) as Promise<NotificacionRecord[]>;
  },

  async countByUsuario(usuarioId: string): Promise<number> {
    return prisma.notificacion.count({ where: { usuarioId } });
  },

  async findById(id: string): Promise<NotificacionRecord | null> {
    return prisma.notificacion.findUnique({ where: { id } }) as Promise<NotificacionRecord | null>;
  },

  async marcarComoLeida(id: string): Promise<NotificacionRecord> {
    return prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    }) as Promise<NotificacionRecord>;
  },

  async findCorreoByUsuarioId(usuarioId: string): Promise<string | null> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { correo: true },
    });
    return usuario?.correo ?? null;
  },
};
