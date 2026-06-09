import api from './api';
import type { ReporteEnviosDto, RepartidorRankingDto, ReporteEnviosFiltroDto } from '@/types/reportes';

export const reportesService = {
  async getReporteEnvios(filtro: ReporteEnviosFiltroDto): Promise<ReporteEnviosDto> {
    const res = await api.get<{ data: ReporteEnviosDto; message: string; status: number }>(
      '/reportes/envios',
      { params: { desde: filtro.desde, hasta: filtro.hasta } },
    );
    return res.data.data;
  },

  async getRepartidoresRanking(): Promise<RepartidorRankingDto[]> {
    const res = await api.get<{ data: RepartidorRankingDto[]; message: string; status: number }>(
      '/reportes/repartidores',
    );
    return res.data.data;
  },

  async exportEnviosCSV(filtro: ReporteEnviosFiltroDto): Promise<Blob> {
    const res = await api({
      method: 'get',
      url: '/reportes/envios/export',
      params: { desde: filtro.desde, hasta: filtro.hasta },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
