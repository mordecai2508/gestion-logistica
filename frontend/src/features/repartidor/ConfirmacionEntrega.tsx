import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';
import { useEntregas } from '@/hooks/useEntregas';
import { useConfirmarEntrega } from '@/hooks/useConfirmarEntrega';
import { useRegistrarFallo } from '@/hooks/useRegistrarFallo';

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

const SIGNATURE_WIDTH = 320;
const SIGNATURE_HEIGHT = 160;

export function ConfirmacionEntrega() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data } = useEntregas();
  const entrega = data?.pendientes.find((e) => e.id === id);

  const [foto, setFoto] = useState<File | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(
    null,
  );
  const [mostrarIncidencia, setMostrarIncidencia] = useState(false);
  const [nota, setNota] = useState('');
  const [fotoFallo, setFotoFallo] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const tieneFirmaRef = useRef(false);

  const confirmarEntrega = useConfirmarEntrega();
  const registrarFallo = useRegistrarFallo();

  const getContext = (): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null;
  };

  const puntoRelativo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  };

  const iniciarTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = getContext();
    if (!ctx) return;
    dibujandoRef.current = true;
    const { x, y } = puntoRelativo(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const continuarTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujandoRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = puntoRelativo(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    tieneFirmaRef.current = true;
  };

  const terminarTrazo = () => {
    dibujandoRef.current = false;
  };

  const limpiarFirma = () => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    tieneFirmaRef.current = false;
  };

  const firmaABlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleConfirmar = async () => {
    if (!id) return;
    if (!foto) {
      setToast({ message: 'Captura una foto de evidencia', variant: 'error' });
      return;
    }
    if (!tieneFirmaRef.current) {
      setToast({ message: 'Captura la firma del receptor', variant: 'error' });
      return;
    }
    const firma = await firmaABlob();
    if (!firma) {
      setToast({ message: 'No fue posible procesar la firma', variant: 'error' });
      return;
    }
    try {
      await confirmarEntrega.mutateAsync({ envioId: id, foto, firma });
      setToast({ message: 'Entrega confirmada', variant: 'success' });
      navigate('/repartidor/entregas');
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'No fue posible confirmar la entrega'),
        variant: 'error',
      });
    }
  };

  const handleRegistrarFallo = async () => {
    if (!id) return;
    if (nota.trim() === '') {
      setToast({ message: 'La nota es requerida', variant: 'error' });
      return;
    }
    try {
      await registrarFallo.mutateAsync({ envioId: id, nota, foto: fotoFallo ?? undefined });
      setToast({ message: 'Fallo de entrega registrado', variant: 'success' });
      navigate('/repartidor/entregas');
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'No fue posible registrar el fallo'),
        variant: 'error',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <span className="font-semibold text-gray-900">Confirmar Entrega</span>
        <span aria-label="Notificaciones" role="img">
          🔔
        </span>
      </header>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <main className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="font-mono text-sm font-semibold text-gray-900">
              {entrega?.codigoSeguimiento ?? id}
            </p>
            <p className="text-sm text-gray-700">Cliente: {entrega?.destinatario ?? '—'}</p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="foto-evidencia">Foto evidencia</Label>
          <input
            id="foto-evidencia"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            aria-label="Foto evidencia"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="firma-receptor">Firma receptor</Label>
          <canvas
            id="firma-receptor"
            ref={canvasRef}
            width={SIGNATURE_WIDTH}
            height={SIGNATURE_HEIGHT}
            aria-label="Área de firma del receptor"
            onPointerDown={iniciarTrazo}
            onPointerMove={continuarTrazo}
            onPointerUp={terminarTrazo}
            onPointerLeave={terminarTrazo}
            className="w-full touch-none rounded-md border border-gray-300 bg-white"
          />
          <Button type="button" variant="outline" size="sm" onClick={limpiarFirma}>
            Limpiar firma
          </Button>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            void handleConfirmar();
          }}
          disabled={confirmarEntrega.isPending}
        >
          {confirmarEntrega.isPending ? 'Confirmando...' : 'CONFIRMAR ENTREGA'}
        </Button>

        <button
          type="button"
          onClick={() => setMostrarIncidencia(true)}
          className="block w-full text-center text-sm text-blue-600 underline-offset-4 hover:underline"
        >
          Reportar incidencia
        </button>

        {mostrarIncidencia && (
          <div
            role="dialog"
            aria-label="Reportar incidencia"
            className="space-y-3 rounded-lg border bg-white p-4 shadow"
          >
            <h2 className="text-base font-semibold text-gray-900">Reportar incidencia</h2>
            <div className="space-y-1">
              <Label htmlFor="nota-incidencia">Motivo</Label>
              <textarea
                id="nota-incidencia"
                aria-label="Motivo de la incidencia"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="foto-incidencia">Foto (opcional)</Label>
              <input
                id="foto-incidencia"
                type="file"
                accept="image/jpeg,image/png"
                aria-label="Foto de la incidencia"
                onChange={(e) => setFotoFallo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  void handleRegistrarFallo();
                }}
                disabled={registrarFallo.isPending}
              >
                {registrarFallo.isPending ? 'Enviando...' : 'Registrar fallo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMostrarIncidencia(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
