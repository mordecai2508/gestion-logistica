import { dashboardRepository } from '../repositories/dashboardRepository';
import type {
  DashboardMetricsDto,
  EnvioRecienteDto,
  RutaPendienteDto,
  VehiculoDisponibleDto,
} from '../types/dashboard';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetricsDto> {
    return dashboardRepository.getMetrics();
  },

  async getEnviosRecientes(): Promise<EnvioRecienteDto[]> {
    const envios = await dashboardRepository.getEnviosRecientes();
    return envios.map((envio) => ({
      codigoSeguimiento: envio.codigoSeguimiento,
      clienteNombre: envio.cliente.usuario.nombre,
      estado: envio.estado as EnvioRecienteDto['estado'],
      createdAt: envio.createdAt.toISOString(),
    }));
  },

  async getRutasPendientes(): Promise<RutaPendienteDto[]> {
    const rutas = await dashboardRepository.getRutasPendientes();
    return rutas.map((ruta) => ({
      id: ruta.id,
      codigo: ruta.codigo,
      nombre: ruta.nombre,
      createdAt: ruta.createdAt.toISOString(),
    }));
  },

  async getVehiculosDisponibles(): Promise<VehiculoDisponibleDto[]> {
    const vehiculos = await dashboardRepository.getVehiculosDisponibles();
    return vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      placa: vehiculo.placa,
      modelo: vehiculo.modelo,
      estado: vehiculo.estado as VehiculoDisponibleDto['estado'],
    }));
  },
};
