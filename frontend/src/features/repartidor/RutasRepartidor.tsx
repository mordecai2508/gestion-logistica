import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRutas } from '@/hooks/useRutas';
import type { RutaDto } from '@/types/rutaTypes';

interface RutaRepartidorCardProps {
  ruta: RutaDto;
}

function RutaRepartidorCard({ ruta }: RutaRepartidorCardProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900">{ruta.codigo}</span>
          <Badge variant="secondary">{ruta.estado}</Badge>
        </div>

        {ruta.envios.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Envíos:</p>
            <ul className="space-y-1">
              {ruta.envios.map((envio) => (
                <li key={envio.id} className="text-sm text-gray-600">
                  <span className="font-mono">{envio.codigoSeguimiento}</span>{' '}
                  <span>{envio.direccionDestino}</span>{' '}
                  <Badge variant="outline">{envio.estado}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RutasRepartidor() {
  const { data, isLoading, isError } = useRutas({ page: 1, limit: 50, repartidorId: 'me' });

  const rutas = data?.data ?? [];

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-900">Mis Rutas</h1>

      {isLoading && <p className="text-sm text-gray-500">Cargando rutas...</p>}

      {isError && (
        <p role="alert" className="text-sm text-red-600">
          No fue posible cargar tus rutas. Intenta nuevamente.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          {rutas.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes rutas asignadas</p>
          ) : (
            rutas.map((ruta) => <RutaRepartidorCard key={ruta.id} ruta={ruta} />)
          )}
        </>
      )}
    </div>
  );
}
