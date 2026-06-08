import api from './api';
import type {
  CrearEnvioDto,
  EnvioResponseDto,
  EnvioListItemDto,
  EnvioDetalleDto,
  EditarEnvioDto,
  EnvioFilters,
  CancelarEnvioResponseDto,
  ReprogramarEnvioResponseDto,
  PaginatedResponse,
} from '@/types/envioTypes';

export type { CrearEnvioDto, EnvioResponseDto };

export const envioService = {
  async crear(dto: CrearEnvioDto): Promise<EnvioResponseDto> {
    const res = await api.post<{ data: EnvioResponseDto; message: string; status: number }>(
      '/envios',
      dto,
    );
    return res.data.data;
  },

  async listar(filters: EnvioFilters): Promise<PaginatedResponse<EnvioListItemDto>> {
    const params: Record<string, string | number> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.estado !== undefined && filters.estado !== '') params.estado = filters.estado;
    if (filters.cliente !== undefined && filters.cliente !== '') params.cliente = filters.cliente;
    if (filters.codigo !== undefined && filters.codigo !== '') params.codigo = filters.codigo;

    const res = await api.get<PaginatedResponse<EnvioListItemDto>>('/envios', { params });
    return res.data;
  },

  async obtenerDetalle(id: string): Promise<EnvioDetalleDto> {
    const res = await api.get<{ data: EnvioDetalleDto; message: string; status: number }>(
      `/envios/${id}`,
    );
    return res.data.data;
  },

  async editar(id: string, dto: EditarEnvioDto): Promise<EnvioResponseDto> {
    const res = await api.patch<{ data: EnvioResponseDto; message: string; status: number }>(
      `/envios/${id}`,
      dto,
    );
    return res.data.data;
  },

  async cancelar(id: string): Promise<CancelarEnvioResponseDto> {
    const res = await api.delete<{
      data: CancelarEnvioResponseDto;
      message: string;
      status: number;
    }>(`/envios/${id}`);
    return res.data.data;
  },

  async reprogramar(
    envioId: string,
    fechaReprogramacion: string,
  ): Promise<ReprogramarEnvioResponseDto> {
    const res = await api.post<{
      data: ReprogramarEnvioResponseDto;
      message: string;
      status: number;
    }>(`/envios/${envioId}/reprogramar`, { fechaReprogramacion });
    return res.data.data;
  },
};
