import { useState } from 'react';
import { Search } from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';
import { useTrackingSocket } from '@/hooks/useTrackingSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrackingMap } from './TrackingMap';
import { EventoTimeline } from './EventoTimeline';
import type { TrackingLocationPayload, EventoEnvioTrackingDto } from '@/types/trackingTypes';

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

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
};

function getLastCoords(
  eventos: EventoEnvioTrackingDto[],
): { lat: number; lng: number } | null {
  const withCoords = [...eventos]
    .reverse()
    .find((ev) => ev.lat !== null && ev.lng !== null);
  if (!withCoords) return null;
  return { lat: withCoords.lat as number, lng: withCoords.lng as number };
}

export function RastrearPaquete() {
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoBuscado, setCodigoBuscado] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [marcadorPos, setMarcadorPos] = useState<{ lat: number; lng: number } | null>(null);

  const { data: resultado, isError, isSuccess } = useTracking(codigoBuscado);

  if (isSuccess && resultado && marcadorPos === null) {
    const coords = getLastCoords(resultado.eventos);
    if (coords) {
      setMarcadorPos(coords);
    }
  }

  const handleLocationUpdate = (payload: TrackingLocationPayload) => {
    setMarcadorPos({ lat: payload.lat, lng: payload.lng });
  };

  useTrackingSocket(resultado?.envioId ?? null, handleLocationUpdate);

  const handleBuscar = () => {
    if (!codigoInput.trim()) {
      setInputError('Ingrese un código de seguimiento');
      return;
    }
    setInputError(null);
    setMarcadorPos(null);
    setCodigoBuscado(codigoInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rastrear Paquete</h1>

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ingrese código de seguimiento"
          value={codigoInput}
          onChange={(e) => setCodigoInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ingrese código de seguimiento"
        />
        <Button onClick={handleBuscar}>
          <Search className="w-4 h-4 mr-2" />
          Buscar
        </Button>
      </div>

      {inputError && (
        <p className="text-sm text-red-600" role="alert">
          {inputError}
        </p>
      )}

      {isError && (
        <p className="text-sm text-red-600" role="alert">
          Código de seguimiento no encontrado
        </p>
      )}

      {isSuccess && resultado && (
        <div className="space-y-4">
          {/* Estado badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${ESTADO_BADGE[resultado.estado] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {resultado.estado}
            </span>
            <span className="text-sm text-gray-600">
              Última actualización: {formatFecha(resultado.ultimaActualizacion)}
            </span>
          </div>

          {/* Shipping info */}
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Remitente:</span> {resultado.remitente}
            </p>
            <p>
              <span className="font-medium">Destinatario:</span> {resultado.destinatario}
            </p>
            <p>
              <span className="font-medium">Dirección destino:</span>{' '}
              {resultado.direccionDestino}
            </p>
          </div>

          {/* Map */}
          <TrackingMap lat={marcadorPos?.lat ?? null} lng={marcadorPos?.lng ?? null} />

          {/* Timeline */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Historial de eventos</h2>
            <EventoTimeline eventos={resultado.eventos} />
          </div>
        </div>
      )}
    </div>
  );
}
