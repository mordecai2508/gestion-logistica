import { Button } from '@/components/ui/button';
import type { RepartidorDto } from '@/types/repartidorTypes';

interface RepartidorDetalleProps {
  repartidor: RepartidorDto;
  onClose: () => void;
}

export function RepartidorDetalle({ repartidor, onClose }: RepartidorDetalleProps) {
  return (
    <div
      role="dialog"
      aria-label={`Detalle de ${repartidor.usuario.nombre}`}
      className="space-y-4 p-6 border rounded-lg bg-white shadow"
    >
      <h2 className="text-lg font-semibold text-gray-900">Detalle del Repartidor</h2>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</dt>
          <dd className="mt-1 text-sm text-gray-900">{repartidor.usuario.nombre}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Correo</dt>
          <dd className="mt-1 text-sm text-gray-900">{repartidor.usuario.correo}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</dt>
          <dd className="mt-1 text-sm text-gray-900">{repartidor.usuario.telefono ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Licencia</dt>
          <dd className="mt-1 font-mono text-sm text-gray-900">{repartidor.licencia ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Disponibilidad</dt>
          <dd className="mt-1">
            <span
              className={[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                repartidor.disponible
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800',
              ].join(' ')}
            >
              {repartidor.disponible ? 'Disponible' : 'No disponible'}
            </span>
          </dd>
        </div>
      </dl>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose} aria-label="Cerrar detalle">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
