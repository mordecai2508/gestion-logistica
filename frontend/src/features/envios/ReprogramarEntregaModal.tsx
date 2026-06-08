import { useState } from 'react';
import { useReprogramarEnvio } from '@/hooks/useReprogramarEnvio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

interface ReprogramarEntregaModalProps {
  envioId: string;
  onClose: () => void;
}

type ToastState = { message: string; variant: 'success' | 'error' } | null;

/** Fecha mínima seleccionable en el input `datetime-local`: ahora + 1 minuto. */
function fechaMinima(): string {
  const fecha = new Date(Date.now() + 60_000);
  fecha.setSeconds(0, 0);
  return fecha.toISOString().slice(0, 16);
}

export function ReprogramarEntregaModal({ envioId, onClose }: ReprogramarEntregaModalProps) {
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const { mutateAsync, isPending } = useReprogramarEnvio();

  const handleReprogramar = async () => {
    if (fecha === '') {
      setError('Selecciona una fecha y hora de entrega');
      return;
    }
    const fechaSeleccionada = new Date(fecha);
    if (Number.isNaN(fechaSeleccionada.getTime()) || fechaSeleccionada.getTime() <= Date.now()) {
      setError('La nueva fecha de entrega debe ser posterior a la fecha y hora actuales');
      return;
    }
    setError(null);

    try {
      await mutateAsync({
        envioId,
        fechaReprogramacion: fechaSeleccionada.toISOString(),
      });
      setToast({ message: 'Entrega reprogramada', variant: 'success' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'No fue posible reprogramar la entrega'),
        variant: 'error',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reprogramar-entrega-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id="reprogramar-entrega-title" className="mb-4 text-lg font-semibold text-gray-900">
          Reprogramar entrega
        </h2>

        <div className="space-y-1">
          <Label htmlFor="reprogramar-fecha">Nueva fecha de entrega</Label>
          <Input
            id="reprogramar-fecha"
            type="datetime-local"
            aria-label="Nueva fecha de entrega"
            min={fechaMinima()}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void handleReprogramar()} disabled={isPending}>
            {isPending ? 'Reprogramando...' : 'Reprogramar'}
          </Button>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default ReprogramarEntregaModal;
