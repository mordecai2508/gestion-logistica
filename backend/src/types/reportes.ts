export interface ReporteEnviosDto {
  porEstado: { estado: string; total: number }[];
  porDia: { fecha: string; total: number }[];
  totalPeriodo: number;
}

export interface RepartidorRankingDto {
  id: string;
  nombre: string;
  totalEntregados: number;
  totalFallidos: number;
}

export interface ReporteEnviosFiltroDto {
  desde: string;
  hasta: string;
}
