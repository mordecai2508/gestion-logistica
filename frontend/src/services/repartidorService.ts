import api from './api';
import type {
  RepartidorDto,
  ActualizarRepartidorInput,
  ListaRepartidoresDto,
  ListarRepartidoresFiltros,
} from '@/types/repartidorTypes';

export const repartidorService = {
  async listar(params: ListarRepartidoresFiltros = {}): Promise<ListaRepartidoresDto> {
    const query: Record<string, string | number> = {};
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.disponible !== undefined) query.disponible = String(params.disponible);

    const res = await api.get<{ data: RepartidorDto[]; meta: ListaRepartidoresDto['meta']; message: string; status: number }>(
      '/repartidores',
      { params: query },
    );
    return { data: res.data.data, meta: res.data.meta };
  },

  async obtenerPorId(id: string): Promise<RepartidorDto> {
    const res = await api.get<{ data: RepartidorDto; message: string; status: number }>(
      `/repartidores/${id}`,
    );
    return res.data.data;
  },

  async actualizar(id: string, dto: ActualizarRepartidorInput): Promise<RepartidorDto> {
    const res = await api.patch<{ data: RepartidorDto; message: string; status: number }>(
      `/repartidores/${id}`,
      dto,
    );
    return res.data.data;
  },
};
