// Réplica de los DTOs del backend (backend/src/types/entregaTypes.ts).
// Sin importar @prisma/client: los enums se replican como uniones de strings,
// siguiendo el patrón de userTypes.ts.

export type EstadoEnvio =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'EN_TRANSITO'
  | 'EN_RUTA'
  | 'ENTREGADO'
  | 'FALLIDO'
  | 'CANCELADO';

export interface EntregaListItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio;
  destinatario: string;
  direccionDestino: string;
  rutaId: string | null;
  updatedAt: string; // ISO 8601 UTC — referencia de "rango horario" en el wireframe
}

export interface EntregasAgrupadasDto {
  pendientes: EntregaListItemDto[];
  completadas: EntregaListItemDto[];
}

export interface ConfirmarEntregaResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio; // "ENTREGADO"
  evidenciaFoto: string;
  firma: string;
  fechaEntrega: string; // ISO 8601 UTC
}

export interface RegistrarFalloResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio; // "FALLIDO"
  incidenciaId: string;
}
