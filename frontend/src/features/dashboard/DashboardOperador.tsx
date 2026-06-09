import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { MetricCard } from './MetricCard';
import { EnviosPieChart } from './EnviosPieChart';
import { EnviosRecientesTable } from './EnviosRecientesTable';
import { RutasPendientesPanel } from './RutasPendientesPanel';
import { VehiculosDisponiblesPanel } from './VehiculosDisponiblesPanel';
import {
  useDashboardMetrics,
  useEnviosRecientes,
  useRutasPendientes,
  useVehiculosDisponibles,
} from '@/hooks/useDashboard';

export function DashboardOperador() {
  const navigate = useNavigate();
  const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

  const metricsQuery = useDashboardMetrics();
  const enviosQuery = useEnviosRecientes();
  const rutasQuery = useRutasPendientes();
  const vehiculosQuery = useVehiculosDisponibles();

  const errors: { key: string; message: string }[] = [];

  if (metricsQuery.isError) {
    errors.push({ key: 'metrics', message: 'Error al cargar métricas del dashboard' });
  }
  if (enviosQuery.isError) {
    errors.push({ key: 'envios', message: 'Error al cargar envíos recientes' });
  }
  if (rutasQuery.isError) {
    errors.push({ key: 'rutas', message: 'Error al cargar rutas pendientes' });
  }
  if (vehiculosQuery.isError) {
    errors.push({ key: 'vehiculos', message: 'Error al cargar vehículos disponibles' });
  }

  const visibleErrors = errors.filter((e) => !dismissedErrors.includes(e.key));

  return (
    <div className="relative min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        {/* Metric cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Envíos"
            value={metricsQuery.data?.totalEnvios}
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            label="En Ruta"
            value={metricsQuery.data?.enRuta}
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            label="Entregados"
            value={metricsQuery.data?.entregados}
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            label="Incidencias Abiertas"
            value={metricsQuery.data?.incidenciasAbiertas}
            isLoading={metricsQuery.isLoading}
          />
        </div>

        {/* Middle row: table + pie chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Envíos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {enviosQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : (
                <EnviosRecientesTable envios={enviosQuery.data ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Envíos</CardTitle>
            </CardHeader>
            <CardContent>
              <EnviosPieChart metrics={metricsQuery.data} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: rutas + vehiculos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rutas Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              {rutasQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : (
                <RutasPendientesPanel rutas={rutasQuery.data ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehículos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              {vehiculosQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : (
                <VehiculosDisponiblesPanel vehiculos={vehiculosQuery.data ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toasts for API errors */}
      {visibleErrors.map((err) => (
        <Toast
          key={err.key}
          message={err.message}
          variant="error"
          onClose={() => setDismissedErrors((prev) => [...prev, err.key])}
        />
      ))}

      {/* Floating "+ Nuevo Envío" button */}
      <Button
        onClick={() => navigate('/envios/crear')}
        className="fixed bottom-8 right-8 z-50 shadow-lg"
        aria-label="Nuevo Envío"
      >
        + Nuevo Envío
      </Button>
    </div>
  );
}
