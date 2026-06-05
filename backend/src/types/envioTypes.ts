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
  createdAt: Date;
}

export interface EnvioListItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  clienteId: string;
  clienteNombre: string;
  createdAt: Date;
}

export interface EventoEnvioDto {
  id: string;
  estado: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: Date;
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
  createdAt: Date;
  updatedAt: Date;
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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedEnviosResponse {
  data: EnvioListItemDto[];
  meta: PaginationMeta;
}

export interface CancelarEnvioResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
}
