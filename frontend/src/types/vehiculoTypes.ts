export type EstadoVehiculo = 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface VehiculoDto {
  id: string;
  placa: string;
  modelo: string;
  capacidad: number;
  estado: EstadoVehiculo;
  createdAt: string;
  updatedAt: string;
}

export interface CrearVehiculoDto {
  placa: string;
  modelo: string;
  capacidad: number;
}

export interface VehiculoFiltros {
  estado?: EstadoVehiculo;
}
