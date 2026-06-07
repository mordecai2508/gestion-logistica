import { cn } from '@/lib/utils';
import type { RutaDto, EstadoRuta } from '@/types/rutaTypes';

interface RutaCardProps {
  ruta: RutaDto;
  onClick?: () => void;
}

const estadoBadgeClass: Record<EstadoRuta, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  EN_CURSO: 'bg-blue-100 text-blue-800',
  EN_PROGRESO: 'bg-blue-100 text-blue-800',
  COMPLETADA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-red-100 text-red-800',
};

const estadoLabel: Record<EstadoRuta, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  EN_PROGRESO: 'En progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

export function RutaCard({ ruta, onClick }: RutaCardProps) {
  return (
    <div
      role="article"
      aria-label={`Ruta ${ruta.codigo}`}
      className={cn(
        'border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm font-semibold text-gray-900">{ruta.codigo}</span>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            estadoBadgeClass[ruta.estado] ?? 'bg-gray-100 text-gray-800',
          )}
        >
          {estadoLabel[ruta.estado] ?? ruta.estado}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <span className="font-medium">Vehículo:</span>{' '}
          {ruta.vehiculo.placa} — {ruta.vehiculo.modelo}
        </p>
        <p>
          <span className="font-medium">Repartidor:</span>{' '}
          {ruta.repartidor.usuario.nombre}
        </p>
        <p>
          <span className="font-medium">Envíos:</span>{' '}
          {ruta.envios.length}
        </p>
      </div>
    </div>
  );
}
