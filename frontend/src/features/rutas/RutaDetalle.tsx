import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { useRutaDetalle } from '@/hooks/useRutaDetalle';
import { useReasignarRuta } from '@/hooks/useReasignarRuta';
import type { VehiculoDto, RepartidorDto } from '@/types/rutaTypes';

// NOTA DE ALCANCE (ver progress/impl_rutas_gestion.md, sección "Correcciones
// aplicadas tras revisión"): igual que en GestionRutas, los selectores de
// "Nuevo vehículo" / "Nuevo repartidor" no tienen un endpoint de
// disponibilidad propio todavía (`vehiculos_gestion`, id 8, sigue `pending`).
// Se mantienen como arreglos vacíos reales — sin datos de muestra que oculten
// la limitación — hasta que esa feature exponga `/api/v1/vehiculos` y un
// listado de repartidores disponibles.
const vehiculosDisponibles: VehiculoDto[] = [];
const repartidoresDisponibles: RepartidorDto[] = [];

export function RutaDetalle() {
  const { id } = useParams<{ id: string }>();
  const rutaId = id ?? '';

  const { data: ruta, isLoading, isError } = useRutaDetalle(rutaId);
  const reasignar = useReasignarRuta(rutaId);

  const [nuevoVehiculoId, setNuevoVehiculoId] = useState('');
  const [nuevoRepartidorId, setNuevoRepartidorId] = useState('');
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const handleReasignar = async () => {
    const dto: { vehiculoId?: string; repartidorId?: string } = {};
    if (nuevoVehiculoId) dto.vehiculoId = nuevoVehiculoId;
    if (nuevoRepartidorId) dto.repartidorId = nuevoRepartidorId;

    if (!dto.vehiculoId && !dto.repartidorId) {
      setToast({ message: 'Selecciona un vehículo o repartidor para reasignar', variant: 'error' });
      return;
    }

    try {
      await reasignar.mutateAsync(dto);
      setToast({ message: 'Ruta reasignada exitosamente', variant: 'success' });
      setNuevoVehiculoId('');
      setNuevoRepartidorId('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reasignar la ruta';
      setToast({ message, variant: 'error' });
    }
  };

  if (isLoading) return <p className="text-center py-8 text-gray-500">Cargando...</p>;
  if (isError || !ruta) return <p className="text-center py-8 text-red-500" role="alert">Error al cargar la ruta</p>;

  const isEditable = ruta.estado !== 'COMPLETADA' && ruta.estado !== 'CANCELADA';

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* Datos principales */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Detalle de Ruta</h1>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Código</dt>
            <dd className="font-mono">{ruta.codigo}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Estado</dt>
            <dd>{ruta.estado}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Vehículo</dt>
            <dd>{ruta.vehiculo.placa} — {ruta.vehiculo.modelo}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Repartidor</dt>
            <dd>{ruta.repartidor.usuario.nombre}</dd>
          </div>
        </dl>
      </div>

      {/* Paradas en orden */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Paradas ({ruta.envios.length})
        </h2>
        {ruta.envios.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin paradas registradas</p>
        ) : (
          <ol className="space-y-3">
            {ruta.envios.map((envio, idx) => (
              <li
                key={envio.id}
                className="flex items-start gap-3 text-sm border-b last:border-b-0 pb-3 last:pb-0"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-gray-900">{envio.codigoSeguimiento}</p>
                  <p className="text-gray-600 truncate">{envio.direccionDestino}</p>
                  {envio.lat != null && envio.lng != null && (
                    <p className="text-gray-400 text-xs">
                      {envio.lat.toFixed(4)}, {envio.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{envio.estado}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Reasignación */}
      {isEditable && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Reasignar Recursos</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nuevo-vehiculo">Nuevo vehículo (opcional)</Label>
              <Select
                id="nuevo-vehiculo"
                value={nuevoVehiculoId}
                onValueChange={setNuevoVehiculoId}
              >
                <option value="">-- Sin cambio --</option>
                {vehiculosDisponibles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.modelo}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nuevo-repartidor">Nuevo repartidor (opcional)</Label>
              <Select
                id="nuevo-repartidor"
                value={nuevoRepartidorId}
                onValueChange={setNuevoRepartidorId}
              >
                <option value="">-- Sin cambio --</option>
                {repartidoresDisponibles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.usuario.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              onClick={() => { void handleReasignar(); }}
              disabled={reasignar.isPending}
            >
              {reasignar.isPending ? 'Reasignando...' : 'Reasignar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
