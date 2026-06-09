import api from './api';
import type { MisEnviosItemDto, MisEnviosFilters } from '@/types/misEnviosTypes';
import type { PaginatedResponse } from '@/types/envioTypes';

export interface ClienteOption {
  id: string;
  usuario: { nombre: string; correo: string };
}

export const clienteService = {
  async search(query: string): Promise<ClienteOption[]> {
    const res = await api.get<{ data: ClienteOption[] }>('/clientes', { params: { search: query } });
    return res.data.data;
  },

  async listarMisEnvios(filters: MisEnviosFilters): Promise<PaginatedResponse<MisEnviosItemDto>> {
    const params: Record<string, string | number> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.estado !== undefined && filters.estado !== '') params.estado = filters.estado;

    const res = await api.get<PaginatedResponse<MisEnviosItemDto>>('/clientes/me/envios', { params });
    return res.data;
  },
};
