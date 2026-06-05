import { Package, Truck, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import type { EventoEnvioTrackingDto } from '@/types/trackingTypes';

function formatFecha(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(',', ' –');
}

const ESTADO_ICON: Record<string, React.ReactNode> = {
  PENDIENTE: <Clock className="w-5 h-5 text-orange-500" />,
  EN_PREPARACION: <Package className="w-5 h-5 text-yellow-500" />,
  EN_TRANSITO: <Truck className="w-5 h-5 text-blue-500" />,
  ENTREGADO: <CheckCircle className="w-5 h-5 text-green-500" />,
  CANCELADO: <XCircle className="w-5 h-5 text-red-500" />,
  FALLIDO: <AlertCircle className="w-5 h-5 text-gray-500" />,
};

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
};

interface EventoTimelineProps {
  eventos: EventoEnvioTrackingDto[];
}

export function EventoTimeline({ eventos }: EventoTimelineProps) {
  if (eventos.length === 0) {
    return <p className="text-sm text-gray-500">Sin eventos registrados.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-4">
      {eventos.map((ev) => (
        <li key={ev.id} className="mb-6 ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-white rounded-full ring-2 ring-gray-200">
            {ESTADO_ICON[ev.estado] ?? <Clock className="w-5 h-5 text-gray-400" />}
          </span>
          <div className="flex flex-col gap-1">
            <time className="text-xs text-gray-500">{formatFecha(ev.timestamp)}</time>
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${ESTADO_BADGE[ev.estado] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {ev.estado}
            </span>
            <p className="text-sm text-gray-700">{ev.descripcion}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
