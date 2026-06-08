import api from './api';
import type {
  NotificacionDto,
  PaginatedNotificacionesResponse,
} from '@/types/notificacionTypes';

export interface NotificacionFilters {
  page?: number;
  limit?: number;
}

export const notificacionService = {
  async listar(filters: NotificacionFilters): Promise<PaginatedNotificacionesResponse> {
    const params: Record<string, number> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;

    const res = await api.get<{
      data: NotificacionDto[];
      meta: PaginatedNotificacionesResponse['meta'];
      message: string;
      status: number;
    }>('/notificaciones', { params });

    return { data: res.data.data, meta: res.data.meta };
  },

  async marcarComoLeida(id: string): Promise<NotificacionDto> {
    const res = await api.patch<{ data: NotificacionDto; message: string; status: number }>(
      `/notificaciones/${id}/leer`,
    );
    return res.data.data;
  },
};
