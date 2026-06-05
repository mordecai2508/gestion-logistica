import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Clock } from 'lucide-react';
import { useEnvioDetalle } from '@/hooks/useEnvioDetalle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
  EN_RUTA: 'bg-blue-100 text-blue-800',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DetalleEnvio() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: envio, isLoading, isError } = useEnvioDetalle(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando envío...</p>
      </div>
    );
  }

  if (isError || !envio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">Envío no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back button */}
        <Button variant="outline" onClick={() => void navigate('/envios')}>
          <ChevronLeft size={16} className="mr-1" aria-hidden="true" />
          Volver
        </Button>

        {/* Main card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">
              {envio.codigoSeguimiento}
            </CardTitle>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${ESTADO_BADGE[envio.estado] ?? 'bg-gray-100 text-gray-800'}`}
              aria-label={`Estado: ${envio.estado}`}
            >
              {envio.estado}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Remitente</p>
              <p className="text-sm text-gray-900">{envio.remitente}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Destinatario</p>
              <p className="text-sm text-gray-900">{envio.destinatario}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Dirección de destino</p>
              <p className="text-sm text-gray-900">{envio.direccionDestino}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Peso</p>
              <p className="text-sm text-gray-900">{envio.peso} kg</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Dimensiones</p>
              <p className="text-sm text-gray-900">{envio.dimensiones} cm</p>
            </div>
            {envio.descripcion && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Descripción</p>
                <p className="text-sm text-gray-900">{envio.descripcion}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Creado</p>
              <p className="text-sm text-gray-900">{formatDate(envio.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Actualizado</p>
              <p className="text-sm text-gray-900">{formatDate(envio.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Historial de eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {envio.eventos.length === 0 ? (
              <p className="text-sm text-gray-500">Sin eventos registrados.</p>
            ) : (
              <ol className="relative border-l border-gray-200 pl-6">
                {envio.eventos.map((evento) => (
                  <li key={evento.id} className="mb-6 last:mb-0">
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} aria-hidden="true" />
                      <time dateTime={evento.timestamp}>{formatDate(evento.timestamp)}</time>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[evento.estado] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {evento.estado}
                      </span>
                      <p className="text-sm text-gray-700">{evento.descripcion}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DetalleEnvio;
