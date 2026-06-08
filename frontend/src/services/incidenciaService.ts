import api from './api';
import type {
  IncidenciaDto,
  IncidenciaListItemDto,
  CrearIncidenciaDto,
  EstadoIncidencia,
  IncidenciaFilters,
  PaginatedIncidenciasResponse,
} from '@/types/incidenciaTypes';

export const incidenciaService = {
  async listar(filters: IncidenciaFilters): Promise<PaginatedIncidenciasResponse> {
    const params: Record<string, string | number> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.tipo !== undefined) params.tipo = filters.tipo;
    if (filters.estado !== undefined) params.estado = filters.estado;

    const res = await api.get<{
      data: IncidenciaListItemDto[];
      meta: PaginatedIncidenciasResponse['meta'];
      message: string;
      status: number;
    }>('/incidencias', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  async crear(dto: CrearIncidenciaDto): Promise<IncidenciaDto> {
    const res = await api.post<{ data: IncidenciaDto; message: string; status: number }>(
      '/incidencias',
      dto,
    );
    return res.data.data;
  },

  async actualizarEstado(id: string, estado: EstadoIncidencia): Promise<IncidenciaDto> {
    const res = await api.patch<{ data: IncidenciaDto; message: string; status: number }>(
      `/incidencias/${id}`,
      { estado },
    );
    return res.data.data;
  },
};
