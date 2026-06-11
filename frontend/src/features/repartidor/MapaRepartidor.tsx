import { useRutas } from '@/hooks/useRutas';
import { RepartidorMap } from './RepartidorMap';
import type { RutaDto, EnvioEnRutaDto, EstadoRuta } from '@/types/rutaTypes';

const ESTADOS_TERMINALES: EstadoRuta[] = ['COMPLETADA', 'CANCELADA'];

function obtenerRutaActiva(rutas: RutaDto[]): RutaDto | undefined {
  return rutas.find((r) => !ESTADOS_TERMINALES.includes(r.estado));
}

function enviosConCoordenadas(ruta: RutaDto | undefined): EnvioEnRutaDto[] {
  if (!ruta) return [];
  return ruta.envios.filter((e) => e.lat != null && e.lng != null);
}

export function MapaRepartidor() {
  const { data, isLoading, isError } = useRutas({ page: 1, limit: 50, repartidorId: 'me' });

  const rutas = data?.data ?? [];
  const rutaActiva = obtenerRutaActiva(rutas);
  const envios = enviosConCoordenadas(rutaActiva);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-md flex-col space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-900">Mapa de Ruta Activa</h1>

      {isLoading && <p className="text-sm text-gray-500">Cargando mapa...</p>}

      {isError && (
        <p role="alert" className="text-sm text-red-600">
          No fue posible cargar la información del mapa. Intenta nuevamente.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          {envios.length === 0 ? (
            <p className="text-sm text-gray-500">Sin ubicaciones disponibles para mostrar</p>
          ) : (
            <div className="flex-1">
              <RepartidorMap envios={envios} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
