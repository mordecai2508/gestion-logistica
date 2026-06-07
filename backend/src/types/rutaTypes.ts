import { EstadoRuta, EstadoVehiculo } from '@prisma/client';

export interface CrearRutaDto {
  enviosIds: string[];
  vehiculoId: string;
  repartidorId: string;
}

export interface ReasignarRutaDto {
  repartidorId?: string;
  vehiculoId?: string;
}

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

export interface RutaResponseDto {
  id: string;
  codigo: string;
  estado: EstadoRuta;
  createdAt: Date;
  updatedAt: Date;
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

export interface RutaOptimaResponseDto {
  paradas: EnvioOrdenadoDto[];
  advertencia?: string;
}

export interface PaginatedRutasResponse {
  data: RutaResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RutaFilters {
  page: number;
  limit: number;
  repartidorId?: string;
}
