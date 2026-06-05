import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEnvios } from '@/hooks/useEnvios';
import { useCancelarEnvio } from '@/hooks/useCancelarEnvio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';
import { EditarEnvioModal } from './EditarEnvioModal';
import type { EnvioFilters } from '@/types/envioTypes';

type ToastState = { message: string; variant: 'success' | 'error' } | null;

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
  EN_RUTA: 'bg-blue-100 text-blue-800',
};

export function ConsultarEnvios() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EnvioFilters>({ page: 1, limit: 20 });
  const [editingEnvioId, setEditingEnvioId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const { data, isLoading, isError } = useEnvios(filters);
  const { mutateAsync: cancelar, isPending: isCancelling } = useCancelarEnvio();

  const handleSearch = () => {
    setFilters({ page: 1, limit: 20, codigo: searchTerm, cliente: searchTerm });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelId) return;
    try {
      await cancelar(confirmCancelId);
      setToast({ message: 'Envío cancelado exitosamente', variant: 'success' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        'Error al cancelar el envío';
      setToast({ message: msg, variant: 'error' });
    } finally {
      setConfirmCancelId(null);
    }
  };

  const meta = data?.meta;
  const envios = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Consultar Envíos</h1>
          <Button onClick={() => void navigate('/envios/crear')}>
            <Plus size={16} className="mr-1" aria-hidden="true" />
            Nuevo Envío
          </Button>
        </div>

        {/* Search bar */}
        <div className="mb-4 flex gap-2">
          <Input
            type="text"
            placeholder="Buscar por código, cliente o estado"
            aria-label="Buscar envíos"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} aria-label="Buscar">
            <Search size={16} aria-hidden="true" />
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-gray-500">Cargando envíos...</div>
          )}
          {isError && (
            <div className="p-8 text-center text-red-600">Error al cargar los envíos.</div>
          )}
          {!isLoading && !isError && (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {envios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron envíos.
                    </td>
                  </tr>
                ) : (
                  envios.map((envio) => (
                    <tr key={envio.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{envio.codigoSeguimiento}</td>
                      <td className="px-4 py-3">{envio.clienteNombre}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[envio.estado] ?? 'bg-gray-100 text-gray-800'}`}
                          aria-label={`Estado: ${envio.estado}`}
                        >
                          {envio.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void navigate(`/envios/${envio.id}`)}
                            aria-label={`Ver envío ${envio.codigoSeguimiento}`}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEnvioId(envio.id)}
                            aria-label={`Editar envío ${envio.codigoSeguimiento}`}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-yellow-600"
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(envio.id)}
                            aria-label={`Eliminar envío ${envio.codigoSeguimiento}`}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                          >
                            <Trash2 size={16} aria-hidden="true" />
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

      {/* Edit modal */}
      {editingEnvioId !== null && (
        <EditarEnvioModal
          envioId={editingEnvioId}
          onClose={() => setEditingEnvioId(null)}
        />
      )}

      {/* AlertDialog — confirm cancel */}
      {confirmCancelId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 id="confirm-cancel-title" className="mb-2 text-lg font-semibold text-gray-900">
              Cancelar envío
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              ¿Está seguro de que desea cancelar este envío? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmCancelId(null)}
                disabled={isCancelling}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmCancel()}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelando...' : 'Confirmar cancelación'}
              </Button>
            </div>
          </div>
        </div>
      )}

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

export default ConsultarEnvios;
