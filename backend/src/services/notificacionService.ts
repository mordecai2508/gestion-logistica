import { notificacionRepository } from '../repositories/notificacionRepository';
import { sendNotificationEmail } from '../lib/mailer';
import { getIo } from '../lib/socketServer';
import { AppError } from '../lib/appError';
import type {
  CrearNotificacionInput,
  NotificacionDto,
  PaginatedNotificacionesResponse,
} from '../types/notificacionTypes';
import type { ListarNotificacionesInput } from '../validators/notificacionValidator';

const EMAIL_TIPOS = new Set(['ENVIO_CREADO', 'ENTREGA_REALIZADA', 'INCIDENCIA_REPORTADA']);

function buildAsunto(tipo: CrearNotificacionInput['tipo']): string {
  switch (tipo) {
    case 'ENVIO_CREADO':
      return `Tu envío fue registrado — Gestión Logística`;
    case 'ENTREGA_REALIZADA':
      return `Tu envío fue entregado — Gestión Logística`;
    case 'INCIDENCIA_REPORTADA':
      return `Incidencia reportada en tu envío — Gestión Logística`;
    default:
      return `Notificación — Gestión Logística`;
  }
}

function toDto(record: {
  id: string;
  tipo: NotificacionDto['tipo'];
  mensaje: string;
  leida: boolean;
  envioId: string | null;
  createdAt: Date;
}): NotificacionDto {
  return {
    id: record.id,
    tipo: record.tipo,
    mensaje: record.mensaje,
    leida: record.leida,
    envioId: record.envioId,
    createdAt: record.createdAt.toISOString(),
  };
}

export const notificacionService = {
  async notificar(input: CrearNotificacionInput): Promise<NotificacionDto> {
    const registro = await notificacionRepository.crear({
      usuarioId: input.usuarioId,
      envioId: input.envioId,
      mensaje: input.mensaje,
      tipo: input.tipo,
    });

    const dto = toDto(registro);

    const io = getIo();
    if (io !== null) {
      io.to(`user:${input.usuarioId}`).emit('notification:new', dto);
    }

    if (EMAIL_TIPOS.has(input.tipo)) {
      // Email sending is best-effort; failures must not propagate
      try {
        const correo = await notificacionRepository.findCorreoByUsuarioId(input.usuarioId);
        if (correo !== null) {
          const asunto = buildAsunto(input.tipo);
          const cuerpoHtml = `<p>${input.mensaje}</p>`;
          await sendNotificationEmail(correo, asunto, cuerpoHtml);
        }
      } catch (err) {
        console.error('[notificacionService] Error al enviar correo de notificación:', err);
      }
    }

    return dto;
  },

  async listar(
    usuarioId: string,
    query: ListarNotificacionesInput,
  ): Promise<PaginatedNotificacionesResponse> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [registros, total] = await Promise.all([
      notificacionRepository.findManyByUsuario(usuarioId, skip, limit),
      notificacionRepository.countByUsuario(usuarioId),
    ]);

    return {
      data: registros.map(toDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async marcarComoLeida(id: string, usuarioId: string): Promise<NotificacionDto> {
    const notificacion = await notificacionRepository.findById(id);

    if (notificacion === null || notificacion.usuarioId !== usuarioId) {
      throw new AppError('NOTIFICACION_NOT_FOUND', 'Notificación no encontrada', 404);
    }

    if (notificacion.leida) {
      return toDto(notificacion);
    }

    const actualizada = await notificacionRepository.marcarComoLeida(id);
    return toDto(actualizada);
  },
};
