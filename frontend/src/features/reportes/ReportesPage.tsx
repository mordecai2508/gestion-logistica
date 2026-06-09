import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { useReporteEnvios, useRepartidoresRanking } from '@/hooks/useReportes';
import { reportesService } from '@/services/reportesService';
import { DateRangePicker } from './DateRangePicker';
import { EnviosPorDiaChart } from './EnviosPorDiaChart';
import { EstadoBreakdownTable } from './EstadoBreakdownTable';
import { RepartidorRankingTable } from './RepartidorRankingTable';

function getDefaultDesde(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function getDefaultHasta(): string {
  return new Date().toISOString().slice(0, 10);
}

type ToastState = { message: string; variant: 'error' } | null;

export function ReportesPage() {
  const [desde, setDesde] = useState(getDefaultDesde);
  const [hasta, setHasta] = useState(getDefaultHasta);
  const [toast, setToast] = useState<ToastState>(null);
  const [isExporting, setIsExporting] = useState(false);

  const enviosQuery = useReporteEnvios({ desde, hasta });
  const rankingQuery = useRepartidoresRanking();

  const handleDateChange = (range: { desde: string; hasta: string }) => {
    setDesde(range.desde);
    setHasta(range.hasta);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await reportesService.exportEnviosCSV({ desde, hasta });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `envios-${desde}-${hasta}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: 'Error al exportar el CSV', variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const hasError = enviosQuery.isError || rankingQuery.isError;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <Button
            onClick={() => void handleExportCSV()}
            disabled={isExporting}
            aria-label="Exportar CSV"
          >
            <Download size={16} className="mr-2" aria-hidden="true" />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>

        {/* Date range picker */}
        <Card>
          <CardHeader>
            <CardTitle>Rango de fechas</CardTitle>
          </CardHeader>
          <CardContent>
            <DateRangePicker desde={desde} hasta={hasta} onChange={handleDateChange} />
          </CardContent>
        </Card>

        {/* Error banner */}
        {hasError && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            Error al cargar los datos del reporte. Por favor, intente de nuevo.
          </p>
        )}

        {/* Envíos por día chart */}
        <Card>
          <CardHeader>
            <CardTitle>Envíos por día</CardTitle>
          </CardHeader>
          <CardContent>
            <EnviosPorDiaChart
              data={enviosQuery.data?.porDia ?? []}
              isLoading={enviosQuery.isLoading}
            />
          </CardContent>
        </Card>

        {/* Estado breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {enviosQuery.isLoading ? (
              <div
                className="h-32 w-full animate-pulse rounded bg-gray-200"
                role="status"
                aria-label="Cargando desglose por estado"
              />
            ) : (
              <EstadoBreakdownTable data={enviosQuery.data?.porEstado ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Repartidor ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de repartidores</CardTitle>
          </CardHeader>
          <CardContent>
            <RepartidorRankingTable
              data={rankingQuery.data ?? []}
              isLoading={rankingQuery.isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
