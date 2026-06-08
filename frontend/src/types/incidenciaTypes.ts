// Réplica de los DTOs del backend (backend/src/types/incidenciaTypes.ts).
// Sin importar @prisma/client: los enums se replican como uniones de strings,
// siguiendo el patrón de entregaTypes.ts (EstadoEnvio).

import type { PaginationMeta } from './envioTypes';

// Nota de nombres: el valor de transmisión es `DANIO` (sin diacrítico, por
// restricción de identificadores en enums SQL — ver design.md sección 2).
// "Daño" se usa solo como etiqueta visual en el frontend (ver TIPO_INCIDENCIA_LABEL).
export type TipoIncidencia =
  | 'ENTREGA_FALLIDA'
  | 'CLIENTE_AUSENTE'
  | 'DANIO'
  | 'DIRECCION_INCORRECTA'
  | 'OTRO';

export type EstadoIncidencia = 'ABIERTA' | 'EN_PROCESO' | 'RESUELTA';

export interface IncidenciaDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  foto: string | null;
  nota: string | null;
  envioId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidenciaListItemDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  envioId: string;
  envioCodigoSeguimiento: string;
  createdAt: string;
}

export interface CrearIncidenciaDto {
  envioId: string;
  tipo: TipoIncidencia;
  descripcion: string;
}

export interface IncidenciaFilters {
  tipo?: TipoIncidencia;
  estado?: EstadoIncidencia;
  page?: number;
  limit?: number;
}

export interface PaginatedIncidenciasResponse {
  data: IncidenciaListItemDto[];
  meta: PaginationMeta;
}

export const TIPO_INCIDENCIA_LABEL: Record<TipoIncidencia, string> = {
  ENTREGA_FALLIDA: 'Entrega fallida',
  CLIENTE_AUSENTE: 'Cliente ausente',
  DANIO: 'Daño',
  DIRECCION_INCORRECTA: 'Dirección incorrecta',
  OTRO: 'Otro',
};
