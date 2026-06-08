import { TipoIncidencia, EstadoIncidencia } from '@prisma/client';
import type { PaginationMeta } from './envioTypes';

export interface IncidenciaDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  foto: string | null;
  nota: string | null;
  envioId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidenciaListItemDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  envioId: string;
  envioCodigoSeguimiento: string;
  createdAt: Date;
}

export interface CrearIncidenciaDto {
  envioId: string;
  tipo: TipoIncidencia;
  descripcion: string;
}

export interface ActualizarEstadoIncidenciaDto {
  estado: EstadoIncidencia;
}

export interface PaginatedIncidenciasResponse {
  data: IncidenciaListItemDto[];
  meta: PaginationMeta;
}
