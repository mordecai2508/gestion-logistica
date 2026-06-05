import { useQuery } from '@tanstack/react-query';
import { trackingService } from '@/services/trackingService';
import type { TrackingResponseDto } from '@/types/trackingTypes';

export const useTracking = (codigo: string | null) => {
  return useQuery<TrackingResponseDto, Error>({
    queryKey: ['tracking', codigo],
    queryFn: () => trackingService.getByCodigo(codigo!),
    enabled: !!codigo,
  });
};
