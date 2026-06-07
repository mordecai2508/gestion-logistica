export type EstadoRuta = 'PENDIENTE' | 'EN_CURSO' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type EstadoVehiculo = 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface VehiculoDto {
  id: string;
  placa: string;
  modelo: string;
  capacidad: number;
  estado: EstadoVehiculo;
}

export interface RepartidorDto {
  id: string;
  usuario: {
    nombre: string;
    correo: string;
  };
  licencia: string | null;
  disponible: boolean;
}

export interface EnvioEnRutaDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  direccionDestino: string;
  lat?: number | null;
  lng?: number | null;
}

export interface RutaDto {
  id: string;
  codigo: string;
  estado: EstadoRuta;
  createdAt: string;
  updatedAt: string;
  vehiculo: VehiculoDto;
  repartidor: RepartidorDto;
  envios: EnvioEnRutaDto[];
}

export interface EnvioOrdenadoDto {
  orden: number;
  envioId: string;
  codigoSeguimiento: string;
  direccionDestino: string;
  lat?: number | null;
  lng?: number | null;
}

export interface RutaOptimaDto {
  paradas: EnvioOrdenadoDto[];
  advertencia?: string;
}

export interface CrearRutaDto {
  enviosIds: string[];
  vehiculoId: string;
  repartidorId: string;
}

export interface ReasignarRutaDto {
  repartidorId?: string;
  vehiculoId?: string;
}

export interface RutaFilters {
  page?: number;
  limit?: number;
  repartidorId?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRutasResponse {
  data: RutaDto[];
  meta: PaginationMeta;
  message: string;
  status: number;
}
