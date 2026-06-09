import { AppError } from '../lib/appError';
import { reportesRepository } from '../repositories/reportesRepository';
import type {
  ReporteEnviosDto,
  RepartidorRankingDto,
  ReporteEnviosFiltroDto,
} from '../types/reportes';

function parseFechaRango(filtro: ReporteEnviosFiltroDto): { desdeDate: Date; hastaDate: Date } {
  const desdeDate = new Date(`${filtro.desde}T00:00:00.000Z`);
  const hastaDate = new Date(`${filtro.hasta}T23:59:59.999Z`);
  return { desdeDate, hastaDate };
}

function wrapCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const reportesService = {
  async getEnviosReport(filtro: ReporteEnviosFiltroDto): Promise<ReporteEnviosDto> {
    const { desdeDate, hastaDate } = parseFechaRango(filtro);

    if (desdeDate > hastaDate) {
      throw new AppError('VALIDATION_ERROR', 'desde debe ser anterior o igual a hasta', 422);
    }

    const [porEstadoRaw, enviosFechas] = await Promise.all([
      reportesRepository.getEnviosPorEstado(desdeDate, hastaDate),
      reportesRepository.getEnviosFechas(desdeDate, hastaDate),
    ]);

    const porEstado = porEstadoRaw.map((row) => ({
      estado: row.estado,
      total: row._count._all,
    }));

    const diaMap = new Map<string, number>();
    for (const envio of enviosFechas) {
      const fecha = envio.createdAt.toISOString().slice(0, 10);
      diaMap.set(fecha, (diaMap.get(fecha) ?? 0) + 1);
    }

    const porDia = Array.from(diaMap.entries())
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const totalPeriodo = porEstado.reduce((acc, row) => acc + row.total, 0);

    return { porEstado, porDia, totalPeriodo };
  },

  async exportEnviosCSV(filtro: ReporteEnviosFiltroDto): Promise<string> {
    const { desdeDate, hastaDate } = parseFechaRango(filtro);

    if (desdeDate > hastaDate) {
      throw new AppError('VALIDATION_ERROR', 'desde debe ser anterior o igual a hasta', 422);
    }

    const filas = await reportesRepository.getEnviosParaCSV(desdeDate, hastaDate);

    const cabecera = 'codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt';

    const lineas = filas.map((fila) =>
      [
        wrapCsvField(fila.codigoSeguimiento),
        wrapCsvField(fila.estado),
        wrapCsvField(fila.remitente),
        wrapCsvField(fila.destinatario),
        wrapCsvField(fila.direccionDestino),
        fila.createdAt.toISOString(),
      ].join(','),
    );

    return [cabecera, ...lineas].join('\n');
  },

  async getRepartidoresRanking(): Promise<RepartidorRankingDto[]> {
    const repartidores = await reportesRepository.getRepartidoresConEnvios();

    const ranking = repartidores.map((rep) => {
      let totalEntregados = 0;
      let totalFallidos = 0;

      for (const ruta of rep.rutas) {
        for (const envio of ruta.envios) {
          if (envio.estado === 'ENTREGADO') {
            totalEntregados += 1;
          } else if (envio.estado === 'FALLIDO' || envio.estado === 'CANCELADO') {
            totalFallidos += 1;
          }
        }
      }

      return {
        id: rep.id,
        nombre: rep.usuario.nombre,
        totalEntregados,
        totalFallidos,
      };
    });

    return ranking.sort((a, b) => b.totalEntregados - a.totalEntregados);
  },
};
