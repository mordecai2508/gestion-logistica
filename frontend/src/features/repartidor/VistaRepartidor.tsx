import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEntregas } from '@/hooks/useEntregas';
import { ReportarIncidencia } from './ReportarIncidencia';
import type { EntregaListItemDto } from '@/types/entregaTypes';

function formatRangoHorario(updatedAt: string): string {
  const fecha = new Date(updatedAt);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface EntregaCardProps {
  entrega: EntregaListItemDto;
  navegable: boolean;
  onReportarIncidencia?: (envioId: string) => void;
}

function EntregaCard({ entrega, navegable, onReportarIncidencia }: EntregaCardProps) {
  const navigate = useNavigate();

  const irAConfirmacion = () => {
    navigate(`/repartidor/entregas/${entrega.id}/confirmar`);
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-sm font-semibold text-gray-900">
            {entrega.codigoSeguimiento}
          </p>
          <p className="truncate text-sm text-gray-700">{entrega.direccionDestino}</p>
          <p className="text-xs text-gray-500">{formatRangoHorario(entrega.updatedAt)}</p>
          {onReportarIncidencia && (
            <button
              type="button"
              onClick={() => onReportarIncidencia(entrega.id)}
              aria-label={`Reportar incidencia para ${entrega.codigoSeguimiento}`}
              className="text-xs text-blue-600 underline-offset-4 hover:underline"
            >
              Reportar incidencia
            </button>
          )}
        </div>
        {navegable && (
          <button
            type="button"
            onClick={irAConfirmacion}
            aria-label={`Confirmar entrega ${entrega.codigoSeguimiento}`}
            className="shrink-0 rounded-md px-3 py-2 text-blue-600 hover:bg-blue-50"
          >
            →
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function VistaRepartidor() {
  const { data, isLoading, isError } = useEntregas();
  const [envioIncidenciaId, setEnvioIncidenciaId] = useState<string | null>(null);

  const pendientes = data?.pendientes ?? [];
  const completadas = data?.completadas ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <span className="font-semibold text-gray-900">Gestión Logística</span>
        <span aria-label="Notificaciones" role="img">
          🔔
        </span>
      </header>

      <main className="flex-1 space-y-4 p-4">
        <h1 className="text-xl font-bold text-gray-900">Mis Entregas</h1>

        {isLoading && <p className="text-sm text-gray-500">Cargando entregas...</p>}

        {isError && (
          <p role="alert" className="text-sm text-red-600">
            No fue posible cargar tus entregas. Intenta nuevamente.
          </p>
        )}

        {!isLoading && !isError && (
          <Tabs defaultValue="pendientes">
            <TabsList className="w-full">
              <TabsTrigger value="pendientes" className="flex-1">
                Pendientes ({pendientes.length})
              </TabsTrigger>
              <TabsTrigger value="completadas" className="flex-1">
                Completadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="space-y-3">
              {pendientes.length === 0 ? (
                <p className="text-sm text-gray-500">No tienes entregas pendientes.</p>
              ) : (
                pendientes.map((entrega) => (
                  <EntregaCard
                    key={entrega.id}
                    entrega={entrega}
                    navegable
                    onReportarIncidencia={setEnvioIncidenciaId}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completadas" className="space-y-3">
              {completadas.length === 0 ? (
                <p className="text-sm text-gray-500">No tienes entregas completadas.</p>
              ) : (
                completadas.map((entrega) => (
                  <EntregaCard key={entrega.id} entrega={entrega} navegable={false} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <nav className="flex items-center justify-around border-t bg-white py-2 text-xs">
        <NavLink to="/repartidor/rutas" className="flex flex-col items-center text-gray-600">
          Rutas
        </NavLink>
        <NavLink
          to="/repartidor/entregas"
          className="flex flex-col items-center font-medium text-blue-600"
        >
          Entregas
        </NavLink>
        <NavLink to="/repartidor/mapa" className="flex flex-col items-center text-gray-600">
          Mapa
        </NavLink>
        <NavLink to="/perfil" className="flex flex-col items-center text-gray-600">
          Perfil
        </NavLink>
      </nav>

      {envioIncidenciaId !== null && (
        <ReportarIncidencia
          envioId={envioIncidenciaId}
          onClose={() => setEnvioIncidenciaId(null)}
        />
      )}
    </div>
  );
}
