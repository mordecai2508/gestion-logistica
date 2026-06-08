import {
  PackageCheck,
  Truck,
  AlertTriangle,
  PackagePlus,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { useNotificacionesSocket } from '@/hooks/useNotificacionesSocket';
import { useMarcarNotificacionLeida } from '@/hooks/useMarcarNotificacionLeida';
import { formatTiempoRelativo } from '@/lib/formatTiempoRelativo';
import type { TipoNotificacion, NotificacionDto } from '@/types/notificacionTypes';

const TIPO_ICON: Record<TipoNotificacion, React.ReactNode> = {
  ENTREGA_REALIZADA: <PackageCheck size={20} aria-hidden="true" />,
  RUTA_ASIGNADA: <Truck size={20} aria-hidden="true" />,
  INCIDENCIA_REPORTADA: <AlertTriangle size={20} aria-hidden="true" />,
  ENVIO_CREADO: <PackagePlus size={20} aria-hidden="true" />,
  CAMBIO_ESTADO: <RefreshCw size={20} aria-hidden="true" />,
};

const TIPO_BORDER: Record<TipoNotificacion, string> = {
  ENTREGA_REALIZADA: 'border-l-green-500',
  RUTA_ASIGNADA: 'border-l-blue-500',
  INCIDENCIA_REPORTADA: 'border-l-red-500',
  ENVIO_CREADO: 'border-l-purple-500',
  CAMBIO_ESTADO: 'border-l-yellow-500',
};

const TIPO_ICON_COLOR: Record<TipoNotificacion, string> = {
  ENTREGA_REALIZADA: 'text-green-600',
  RUTA_ASIGNADA: 'text-blue-600',
  INCIDENCIA_REPORTADA: 'text-red-600',
  ENVIO_CREADO: 'text-purple-600',
  CAMBIO_ESTADO: 'text-yellow-600',
};

interface NotificacionItemProps {
  notificacion: NotificacionDto;
  filters: { page?: number; limit?: number };
}

function NotificacionItem({ notificacion, filters }: NotificacionItemProps) {
  const { mutate, isPending } = useMarcarNotificacionLeida(filters);

  return (
    <li
      className={`border-l-4 ${TIPO_BORDER[notificacion.tipo]} bg-white p-4 shadow-sm rounded-r-lg flex items-start gap-3 ${notificacion.leida ? 'opacity-70' : ''}`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${TIPO_ICON_COLOR[notificacion.tipo]}`}>
        {TIPO_ICON[notificacion.tipo]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notificacion.leida ? 'font-normal text-gray-600' : 'font-bold text-gray-900'}`}>
          {notificacion.mensaje}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{notificacion.mensaje}</p>
        <p className="text-xs text-gray-400 mt-1">{formatTiempoRelativo(notificacion.createdAt)}</p>
      </div>
      {!notificacion.leida && (
        <button
          type="button"
          onClick={() => mutate(notificacion.id)}
          disabled={isPending}
          aria-label="Marcar como leída"
          className="flex-shrink-0 mt-0.5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 disabled:opacity-40"
        >
          <Check size={16} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

export function Notificaciones() {
  const [filters, setFilters] = useState<{ page: number; limit: number }>({ page: 1, limit: 20 });

  const { data, isLoading, isError } = useNotificaciones(filters);
  useNotificacionesSocket(filters);

  const notificaciones = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Notificaciones</h1>

        {isLoading && (
          <div className="p-8 text-center text-gray-500">Cargando notificaciones...</div>
        )}

        {isError && (
          <div className="p-8 text-center text-red-600">Error al cargar las notificaciones.</div>
        )}

        {!isLoading && !isError && (
          <>
            {notificaciones.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
                No tienes notificaciones
              </div>
            ) : (
              <ul className="space-y-3" aria-label="Lista de notificaciones">
                {notificaciones.map((notif) => (
                  <NotificacionItem key={notif.id} notificacion={notif} filters={filters} />
                ))}
              </ul>
            )}

            {meta && meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
                  }
                  disabled={filters.page <= 1}
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
                    className={`rounded px-3 py-1 text-sm ${
                      p === meta.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, f.page + 1) }))
                  }
                  disabled={filters.page >= meta.totalPages}
                  aria-label="Página siguiente"
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Notificaciones;
