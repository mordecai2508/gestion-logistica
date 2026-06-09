import { useQuery } from '@tanstack/react-query';
import { reportesService } from '@/services/reportesService';
import type { ReporteEnviosFiltroDto } from '@/types/reportes';

export const useReporteEnvios = (filtro: ReporteEnviosFiltroDto) => {
  return useQuery({
    queryKey: ['reportes', 'envios', filtro],
    queryFn: () => reportesService.getReporteEnvios(filtro),
    staleTime: 60_000,
  });
};

export const useRepartidoresRanking = () => {
  return useQuery({
    queryKey: ['reportes', 'repartidores'],
    queryFn: () => reportesService.getRepartidoresRanking(),
    staleTime: 60_000,
  });
};
