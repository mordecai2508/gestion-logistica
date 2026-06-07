import { EstadoVehiculo } from '@prisma/client';

export interface CrearVehiculoDto {
  placa: string;
  modelo: string;
  capacidad: number;
}

export interface ListarVehiculosFiltros {
  estado?: EstadoVehiculo;
}

export interface VehiculoResponseDto {
  id: string;
  placa: string;
  modelo: string;
  capacidad: number;
  estado: EstadoVehiculo;
  createdAt: Date;
  updatedAt: Date;
}
