import type { PaginationMeta } from './envioTypes';

export type TipoNotificacion =
  | 'ENVIO_CREADO'
  | 'CAMBIO_ESTADO'
  | 'ENTREGA_REALIZADA'
  | 'RUTA_ASIGNADA'
  | 'INCIDENCIA_REPORTADA';

export interface NotificacionDto {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  envioId: string | null;
  createdAt: string; // ISO 8601 UTC
}

export interface CrearNotificacionInput {
  usuarioId: string;
  envioId?: string;
  mensaje: string;
  tipo: TipoNotificacion;
}

export type NotificationNewPayload = NotificacionDto;

export interface PaginatedNotificacionesResponse {
  data: NotificacionDto[];
  meta: PaginationMeta;
}
