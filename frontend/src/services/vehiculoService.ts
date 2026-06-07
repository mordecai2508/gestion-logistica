import api from './api';
import type { VehiculoDto, CrearVehiculoDto, VehiculoFiltros, EstadoVehiculo } from '@/types/vehiculoTypes';

export const vehiculoService = {
  async listar(filters?: VehiculoFiltros): Promise<VehiculoDto[]> {
    const params: Record<string, string> = {};
    if (filters?.estado !== undefined) {
      params.estado = filters.estado;
    }
    const res = await api.get<{ data: VehiculoDto[]; message: string; status: number }>('/vehiculos', { params });
    return res.data.data;
  },

  async crear(dto: CrearVehiculoDto): Promise<VehiculoDto> {
    const res = await api.post<{ data: VehiculoDto; message: string; status: number }>('/vehiculos', dto);
    return res.data.data;
  },

  async actualizarEstado(id: string, estado: EstadoVehiculo): Promise<VehiculoDto> {
    const res = await api.patch<{ data: VehiculoDto; message: string; status: number }>(
      `/vehiculos/${id}`,
      { estado },
    );
    return res.data.data;
  },
};
