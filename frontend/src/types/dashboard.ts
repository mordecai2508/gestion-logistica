export type EstadoEnvio =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'EN_TRANSITO'
  | 'EN_RUTA'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'FALLIDO';

export type EstadoVehiculo = 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface DashboardMetricsDto {
  totalEnvios: number;
  enRuta: number;
  entregados: number;
  incidenciasAbiertas: number;
}

export interface EnvioRecienteDto {
  codigoSeguimiento: string;
  clienteNombre: string;
  estado: EstadoEnvio;
  createdAt: string;
}

export interface RutaPendienteDto {
  id: string;
  codigo: string;
  nombre: string | null;
  createdAt: string;
}

export interface VehiculoDisponibleDto {
  id: string;
  placa: string;
  modelo: string;
  estado: EstadoVehiculo;
}
