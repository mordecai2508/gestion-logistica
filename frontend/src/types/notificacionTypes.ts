// Réplica de los DTOs del backend (backend/src/types/notificacionTypes.ts).
// Sin importar @prisma/client: los enums se replican como uniones de strings.

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

export interface PaginatedNotificacionesResponse {
  data: NotificacionDto[];
  meta: PaginationMeta;
}

export type NotificationNewPayload = NotificacionDto;
