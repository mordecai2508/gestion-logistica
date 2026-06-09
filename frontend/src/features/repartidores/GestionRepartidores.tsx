import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { RepartidorTable } from './RepartidorTable';
import { RepartidorDetalle } from './RepartidorDetalle';
import { EditarRepartidor } from './EditarRepartidor';
import { useRepartidores } from '@/hooks/useRepartidores';
import type { RepartidorDto } from '@/types/repartidorTypes';

type DisponibilidadFiltro = 'todos' | 'disponible' | 'no-disponible';

const FILTROS: { value: DisponibilidadFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'no-disponible', label: 'No disponible' },
];

export function GestionRepartidores() {
  const [filtroDisponible, setFiltroDisponible] = useState<DisponibilidadFiltro>('todos');
  const [page, setPage] = useState(1);
  const [repartidorVer, setRepartidorVer] = useState<RepartidorDto | null>(null);
  const [repartidorEditar, setRepartidorEditar] = useState<RepartidorDto | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filtros = {
    page,
    limit: 20,
    ...(filtroDisponible === 'disponible' ? { disponible: true } : {}),
    ...(filtroDisponible === 'no-disponible' ? { disponible: false } : {}),
  };

  const { data, isLoading, isError, refetch } = useRepartidores(filtros);

  const repartidores = data?.data ?? [];
  const meta = data?.meta;

  const handleFiltroChange = (value: DisponibilidadFiltro) => {
    setFiltroDisponible(value);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {successToast !== null && (
        <Toast message={successToast} variant="success" onClose={() => setSuccessToast(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Repartidores</h1>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-disponibilidad-select">Filtrar por disponibilidad</Label>
          <Select
            id="filtro-disponibilidad-select"
            value={filtroDisponible}
            onValueChange={(value) => handleFiltroChange(value as DisponibilidadFiltro)}
            aria-label="Filtrar por disponibilidad"
            disabled={isLoading}
          >
            {FILTROS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 overflow-x-auto">
          {isLoading && (
            <p className="text-gray-500 text-center py-8" aria-busy="true">
              Cargando repartidores...
            </p>
          )}

          {isError && (
            <div className="text-center py-8 space-y-3">
              <p className="text-red-500" role="alert">
                Error al cargar los repartidores
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => { void refetch(); }}
                aria-label="Reintentar carga de repartidores"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <RepartidorTable
              repartidores={repartidores}
              onVer={(rep) => setRepartidorVer(rep)}
              onEditar={(rep) => setRepartidorEditar(rep)}
            />
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Página {meta.page} de {meta.totalPages} — {meta.total} repartidores
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={meta.page <= 1}
                aria-label="Página anterior"
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                disabled={meta.page >= meta.totalPages}
                aria-label="Página siguiente"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {repartidorVer !== null && (
        <div className="mt-6">
          <RepartidorDetalle
            repartidor={repartidorVer}
            onClose={() => setRepartidorVer(null)}
          />
        </div>
      )}

      {repartidorEditar !== null && (
        <div className="mt-6">
          <EditarRepartidor
            repartidor={repartidorEditar}
            onClose={() => setRepartidorEditar(null)}
            onSuccess={(msg) => setSuccessToast(msg)}
          />
        </div>
      )}
    </div>
  );
}
