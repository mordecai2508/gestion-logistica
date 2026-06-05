import api from './api';
import type { TrackingResponseDto } from '@/types/trackingTypes';

export const trackingService = {
  async getByCodigo(codigo: string): Promise<TrackingResponseDto> {
    const res = await api.get(`/tracking/${codigo}`);
    return res.data.data as TrackingResponseDto;
  },
};
