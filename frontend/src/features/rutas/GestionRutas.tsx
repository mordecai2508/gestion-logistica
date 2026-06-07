import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RutaCard } from './RutaCard';
import { RutaForm } from './RutaForm';
import { useRutas } from '@/hooks/useRutas';
import { useEnvios } from '@/hooks/useEnvios';
import type { VehiculoDto, RepartidorDto } from '@/types/rutaTypes';

// NOTA DE ALCANCE (ver progress/impl_rutas_gestion.md, sección "Correcciones
// aplicadas tras revisión"): no existe todavía un endpoint `/api/v1/vehiculos`
// ni uno de repartidores disponibles — `vehiculos_gestion` (id 8) sigue
// `pending` en feature_list.json. `RutaForm` recibe arreglos vacíos para esos
// dos selectores (en vez de datos de muestra que ocultarían el problema): el
// formulario es honesto sobre su estado — el operador puede ver y completar
// la lista de envíos disponibles (datos reales vía useEnvios) y la lista de
// rutas reales, pero los selectores de vehículo/repartidor quedarán
// operativos cuando `vehiculos_gestion` exponga sus endpoints.
const vehiculosDisponibles: VehiculoDto[] = [];
const repartidoresDisponibles: RepartidorDto[] = [];

export function GestionRutas() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useRutas({ page: 1, limit: 20 });
  const { data: enviosPendientes } = useEnvios({ page: 1, limit: 100, estado: 'PENDIENTE' });

  const rutas = data?.data ?? [];
  const enviosDisponibles = enviosPendientes?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Rutas</h1>
        <Button
          onClick={() => setShowForm((prev) => !prev)}
          aria-label={showForm ? 'Cerrar formulario' : 'Nueva ruta'}
        >
          {showForm ? 'Cancelar' : '+ Nueva Ruta'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 border rounded-lg bg-white shadow">
          <h2 className="text-lg font-semibold mb-4">Nueva Ruta</h2>
          <RutaForm
            enviosDisponibles={enviosDisponibles.map((e) => ({
              id: e.id,
              codigoSeguimiento: e.codigoSeguimiento,
              direccionDestino: e.destinatario,
            }))}
            vehiculosDisponibles={vehiculosDisponibles}
            repartidoresDisponibles={repartidoresDisponibles}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading && <p className="text-gray-500 text-center py-8">Cargando rutas...</p>}

      {isError && (
        <p className="text-red-500 text-center py-8" role="alert">
          Error al cargar las rutas
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rutas.map((ruta) => (
            <RutaCard
              key={ruta.id}
              ruta={ruta}
              onClick={() => navigate(`/rutas/${ruta.id}`)}
            />
          ))}
          {rutas.length === 0 && (
            <p className="text-gray-400 text-center col-span-3 py-8">
              No hay rutas registradas
            </p>
          )}
        </div>
      )}

      {data?.meta && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {data.meta.total} rutas — Página {data.meta.page} de {data.meta.totalPages}
        </div>
      )}
    </div>
  );
}
