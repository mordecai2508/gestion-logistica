import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => dashboardService.getMetrics(),
    staleTime: 60_000,
  });
};

export const useEnviosRecientes = () => {
  return useQuery({
    queryKey: ['dashboard', 'enviosRecientes'],
    queryFn: () => dashboardService.getEnviosRecientes(),
    staleTime: 60_000,
  });
};

export const useRutasPendientes = () => {
  return useQuery({
    queryKey: ['dashboard', 'rutasPendientes'],
    queryFn: () => dashboardService.getRutasPendientes(),
    staleTime: 60_000,
  });
};

export const useVehiculosDisponibles = () => {
  return useQuery({
    queryKey: ['dashboard', 'vehiculosDisponibles'],
    queryFn: () => dashboardService.getVehiculosDisponibles(),
    staleTime: 60_000,
  });
};
