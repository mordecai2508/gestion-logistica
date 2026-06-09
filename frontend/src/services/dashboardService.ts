import api from './api';
import type {
  DashboardMetricsDto,
  EnvioRecienteDto,
  RutaPendienteDto,
  VehiculoDisponibleDto,
} from '@/types/dashboard';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetricsDto> {
    const res = await api.get<{ data: DashboardMetricsDto; message: string; status: number }>(
      '/dashboard/metrics',
    );
    return res.data.data;
  },

  async getEnviosRecientes(): Promise<EnvioRecienteDto[]> {
    const res = await api.get<{ data: EnvioRecienteDto[]; message: string; status: number }>(
      '/dashboard/envios-recientes',
    );
    return res.data.data;
  },

  async getRutasPendientes(): Promise<RutaPendienteDto[]> {
    const res = await api.get<{ data: RutaPendienteDto[]; message: string; status: number }>(
      '/dashboard/rutas-pendientes',
    );
    return res.data.data;
  },

  async getVehiculosDisponibles(): Promise<VehiculoDisponibleDto[]> {
    const res = await api.get<{ data: VehiculoDisponibleDto[]; message: string; status: number }>(
      '/dashboard/vehiculos-disponibles',
    );
    return res.data.data;
  },
};
