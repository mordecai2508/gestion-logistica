import api from './api';
import type {
  RutaDto,
  RutaOptimaDto,
  CrearRutaDto,
  ReasignarRutaDto,
  RutaFilters,
  PaginatedRutasResponse,
} from '@/types/rutaTypes';

export const rutaService = {
  async listar(filters: RutaFilters): Promise<PaginatedRutasResponse> {
    const params: Record<string, string | number> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.repartidorId !== undefined && filters.repartidorId !== '') {
      params.repartidorId = filters.repartidorId;
    }
    const res = await api.get<PaginatedRutasResponse>('/rutas', { params });
    return res.data;
  },

  async obtenerDetalle(id: string): Promise<RutaDto> {
    const res = await api.get<{ data: RutaDto; message: string; status: number }>(`/rutas/${id}`);
    return res.data.data;
  },

  async crear(dto: CrearRutaDto): Promise<RutaDto> {
    const res = await api.post<{ data: RutaDto; message: string; status: number }>('/rutas', dto);
    return res.data.data;
  },

  async reasignar(id: string, dto: ReasignarRutaDto): Promise<RutaDto> {
    const res = await api.patch<{ data: RutaDto; message: string; status: number }>(
      `/rutas/${id}`,
      dto,
    );
    return res.data.data;
  },

  async obtenerOptima(id: string): Promise<RutaOptimaDto> {
    const res = await api.get<{ data: RutaOptimaDto; message: string; status: number }>(
      `/rutas/${id}/optima`,
    );
    return res.data.data;
  },
};
