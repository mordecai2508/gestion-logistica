export interface CrearEnvioDto {
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  peso: number;
  dimensiones: string;
  clienteId: string;
  descripcion?: string;
}

export interface EnvioResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  peso: number;
  dimensiones: string;
  descripcion: string | null;
  clienteId: string;
  createdAt: string;
}

export interface EnvioListItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  clienteId: string;
  clienteNombre: string;
  createdAt: string;
}

export interface EventoEnvioDto {
  id: string;
  estado: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: string;
}

export interface EnvioDetalleDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  peso: number;
  dimensiones: string;
  descripcion: string | null;
  clienteId: string;
  rutaId: string | null;
  createdAt: string;
  updatedAt: string;
  eventos: EventoEnvioDto[];
}

export interface EditarEnvioDto {
  remitente?: string;
  destinatario?: string;
  direccionDestino?: string;
  peso?: number;
  dimensiones?: string;
  descripcion?: string | null;
}

export interface EnvioFilters {
  page?: number;
  limit?: number;
  estado?: string;
  cliente?: string;
  codigo?: string;
}

export interface CancelarEnvioResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message: string;
  status: number;
}

export interface ReprogramarEnvioDto {
  fechaReprogramacion: string;
}

export interface ReprogramarEnvioResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  fechaReprogramacion: string;
}
