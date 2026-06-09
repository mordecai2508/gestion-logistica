import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMisEnvios } from '@/hooks/useMisEnvios';

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  EN_RUTA: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
};

const ESTADO_OPTIONS = [
  'PENDIENTE',
  'EN_PREPARACION',
  'EN_TRANSITO',
  'EN_RUTA',
  'ENTREGADO',
  'CANCELADO',
  'FALLIDO',
] as const;

export function MisEnvios() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const { data, isLoading, isError } = useMisEnvios({
    page,
    limit: 10,
    estado: estadoFiltro || undefined,
  });

  const meta = data?.meta;
  const envios = data?.data ?? [];

  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEstadoFiltro(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mis Envíos</h1>
          <select
            value={estadoFiltro}
            onChange={handleEstadoChange}
            aria-label="Filtrar por estado"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {ESTADO_OPTIONS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-gray-500" role="status" aria-label="Cargando">
              Cargando envíos...
            </div>
          )}
          {isError && (
            <div className="p-8 text-center text-red-600">
              Error al cargar tus envíos. Intenta de nuevo más tarde.
            </div>
          )}
          {!isLoading && !isError && envios.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Aún no tienes envíos registrados
            </div>
          )}
          {!isLoading && !isError && envios.length > 0 && (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Destinatario</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha creación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((envio) => (
                  <tr key={envio.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{envio.codigoSeguimiento}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[envio.estado] ?? 'bg-gray-100 text-gray-800'}`}
                        aria-label={`Estado: ${envio.estado}`}
                      >
                        {envio.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">{envio.destinatario}</td>
                    <td className="px-4 py-3">
                      {new Date(envio.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void navigate(`/tracking/${envio.codigoSeguimiento}`)}
                        aria-label={`Rastrear envío ${envio.codigoSeguimiento}`}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Rastrear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Página anterior"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-label={`Página ${p}`}
                  aria-current={p === meta.page ? 'page' : undefined}
                  className={`rounded px-3 py-1 text-sm ${p === meta.page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                aria-label="Página siguiente"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MisEnvios;
