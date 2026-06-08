import { useState } from 'react';
import { Eye, Pencil, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useIncidencias } from '@/hooks/useIncidencias';
import { useActualizarEstadoIncidencia } from '@/hooks/useActualizarEstadoIncidencia';
import { Button } from '@/components/ui/button';
import { Select, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';
import {
  TIPO_INCIDENCIA_LABEL,
  type EstadoIncidencia,
  type IncidenciaFilters,
  type IncidenciaListItemDto,
  type TipoIncidencia,
} from '@/types/incidenciaTypes';

type ToastState = { message: string; variant: 'success' | 'error' } | null;

const TIPO_OPTIONS: TipoIncidencia[] = [
  'ENTREGA_FALLIDA',
  'CLIENTE_AUSENTE',
  'DANIO',
  'DIRECCION_INCORRECTA',
  'OTRO',
];

const ESTADO_OPTIONS: EstadoIncidencia[] = ['ABIERTA', 'EN_PROCESO', 'RESUELTA'];

const ESTADO_BADGE: Record<EstadoIncidencia, string> = {
  ABIERTA: 'bg-orange-100 text-orange-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  RESUELTA: 'bg-green-100 text-green-800',
};

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DetalleIncidenciaDialogProps {
  incidencia: IncidenciaListItemDto;
  onClose: () => void;
}

function DetalleIncidenciaDialog({ incidencia, onClose }: DetalleIncidenciaDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-incidencia-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="detalle-incidencia-title" className="mb-4 text-lg font-semibold text-gray-900">
          Detalle de incidencia
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Código</dt>
            <dd className="font-mono text-gray-900">{incidencia.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Envío</dt>
            <dd className="font-mono text-gray-900">{incidencia.envioCodigoSeguimiento}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Tipo</dt>
            <dd className="text-gray-900">{TIPO_INCIDENCIA_LABEL[incidencia.tipo]}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Descripción</dt>
            <dd className="text-gray-900">{incidencia.descripcion}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Estado</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[incidencia.estado]}`}
              >
                {incidencia.estado}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 uppercase text-xs">Fecha de creación</dt>
            <dd className="text-gray-900">{formatDate(incidencia.createdAt)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CambiarEstadoIncidenciaModalProps {
  incidencia: IncidenciaListItemDto;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

function CambiarEstadoIncidenciaModal({
  incidencia,
  onClose,
  onSuccess,
  onError,
}: CambiarEstadoIncidenciaModalProps) {
  const [estado, setEstado] = useState<EstadoIncidencia>(incidencia.estado);
  const { mutateAsync, isPending } = useActualizarEstadoIncidencia();

  const handleGuardar = async () => {
    try {
      await mutateAsync({ id: incidencia.id, estado });
      onSuccess('Estado de incidencia actualizado');
      onClose();
    } catch (err: unknown) {
      onError(extraerMensajeError(err, 'No fue posible actualizar el estado de la incidencia'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cambiar-estado-incidencia-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id="cambiar-estado-incidencia-title" className="mb-4 text-lg font-semibold text-gray-900">
          Cambiar estado de incidencia
        </h2>
        <div className="space-y-1">
          <Label htmlFor="select-nuevo-estado">Nuevo estado</Label>
          <Select
            id="select-nuevo-estado"
            aria-label="Nuevo estado"
            value={estado}
            onValueChange={(value) => setEstado(value as EstadoIncidencia)}
          >
            {ESTADO_OPTIONS.map((opcion) => (
              <SelectItem key={opcion} value={opcion}>
                {opcion}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void handleGuardar()} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GestionIncidencias() {
  const rol = useAuthStore((state) => state.user?.rol);

  const [filters, setFilters] = useState<IncidenciaFilters>({ page: 1, limit: 20 });
  const [detalleIncidencia, setDetalleIncidencia] = useState<IncidenciaListItemDto | null>(null);
  const [editandoIncidencia, setEditandoIncidencia] = useState<IncidenciaListItemDto | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const { data, isLoading, isError } = useIncidencias(filters);

  const meta = data?.meta;
  const incidencias = data?.data ?? [];

  const handleTipoChange = (value: string) => {
    setFilters((f) => ({
      ...f,
      page: 1,
      tipo: value === 'TODOS' ? undefined : (value as TipoIncidencia),
    }));
  };

  const handleEstadoChange = (value: string) => {
    setFilters((f) => ({
      ...f,
      page: 1,
      estado: value === 'TODOS' ? undefined : (value as EstadoIncidencia),
    }));
  };

  // Nota de alcance (design.md sección 4): el wireframe incluye un botón
  // "+ Nueva Incidencia" en esta pantalla, pero `POST /api/v1/incidencias`
  // está restringido a rol REPARTIDOR (R4). Para el rol OPERADOR el botón se
  // muestra deshabilitado con un tooltip explicativo — NO se construye un
  // formulario de creación que el backend rechazaría con 403.
  const nuevaIncidenciaDeshabilitada = rol === 'OPERADOR';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <span title={nuevaIncidenciaDeshabilitada ? 'Solo el repartidor puede reportar incidencias' : undefined}>
            <Button disabled={nuevaIncidenciaDeshabilitada} aria-disabled={nuevaIncidenciaDeshabilitada}>
              <Plus size={16} className="mr-1" aria-hidden="true" />
              + Nueva Incidencia
            </Button>
          </span>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="filtro-tipo">Tipo</Label>
            <Select
              id="filtro-tipo"
              aria-label="Filtrar por tipo"
              value={filters.tipo ?? 'TODOS'}
              onValueChange={handleTipoChange}
            >
              <SelectItem value="TODOS">Todos</SelectItem>
              {TIPO_OPTIONS.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPO_INCIDENCIA_LABEL[tipo]}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-estado">Estado</Label>
            <Select
              id="filtro-estado"
              aria-label="Filtrar por estado"
              value={filters.estado ?? 'TODOS'}
              onValueChange={handleEstadoChange}
            >
              <SelectItem value="TODOS">Todos</SelectItem>
              {ESTADO_OPTIONS.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {estado}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-gray-500">Cargando incidencias...</div>
          )}
          {isError && (
            <div className="p-8 text-center text-red-600">Error al cargar las incidencias.</div>
          )}
          {!isLoading && !isError && (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron incidencias.
                    </td>
                  </tr>
                ) : (
                  incidencias.map((incidencia) => (
                    <tr key={incidencia.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{incidencia.envioCodigoSeguimiento}</td>
                      <td className="px-4 py-3">{TIPO_INCIDENCIA_LABEL[incidencia.tipo]}</td>
                      <td className="max-w-xs truncate px-4 py-3" title={incidencia.descripcion}>
                        {incidencia.descripcion}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[incidencia.estado]}`}
                          aria-label={`Estado: ${incidencia.estado}`}
                        >
                          {incidencia.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDetalleIncidencia(incidencia)}
                            aria-label={`Ver incidencia ${incidencia.envioCodigoSeguimiento}`}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoIncidencia(incidencia)}
                            aria-label={`Editar incidencia ${incidencia.envioCodigoSeguimiento}`}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-yellow-600"
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                disabled={(filters.page ?? 1) <= 1}
                aria-label="Página anterior"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, page: p }))}
                  aria-label={`Página ${p}`}
                  aria-current={p === meta.page ? 'page' : undefined}
                  className={`rounded px-3 py-1 text-sm ${p === meta.page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    page: Math.min(meta.totalPages, (f.page ?? 1) + 1),
                  }))
                }
                disabled={(filters.page ?? 1) >= meta.totalPages}
                aria-label="Página siguiente"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View detail dialog */}
      {detalleIncidencia !== null && (
        <DetalleIncidenciaDialog
          incidencia={detalleIncidencia}
          onClose={() => setDetalleIncidencia(null)}
        />
      )}

      {/* Edit (change status) modal */}
      {editandoIncidencia !== null && (
        <CambiarEstadoIncidenciaModal
          incidencia={editandoIncidencia}
          onClose={() => setEditandoIncidencia(null)}
          onSuccess={(mensaje) => setToast({ message: mensaje, variant: 'success' })}
          onError={(mensaje) => setToast({ message: mensaje, variant: 'error' })}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default GestionIncidencias;
