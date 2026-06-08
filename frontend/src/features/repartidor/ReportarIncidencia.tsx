import { useState } from 'react';
import { useCrearIncidencia } from '@/hooks/useCrearIncidencia';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { TIPO_INCIDENCIA_LABEL, type TipoIncidencia } from '@/types/incidenciaTypes';

const TIPO_OPTIONS: TipoIncidencia[] = [
  'ENTREGA_FALLIDA',
  'CLIENTE_AUSENTE',
  'DANIO',
  'DIRECCION_INCORRECTA',
  'OTRO',
];

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

interface ReportarIncidenciaProps {
  envioId: string;
  onClose: () => void;
}

type ToastState = { message: string; variant: 'success' | 'error' } | null;

export function ReportarIncidencia({ envioId, onClose }: ReportarIncidenciaProps) {
  const [tipo, setTipo] = useState<TipoIncidencia>('CLIENTE_AUSENTE');
  const [descripcion, setDescripcion] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const { mutateAsync, isPending } = useCrearIncidencia();

  const handleEnviar = async () => {
    if (descripcion.trim() === '') {
      setToast({ message: 'La descripción es requerida', variant: 'error' });
      return;
    }
    try {
      await mutateAsync({ envioId, tipo, descripcion });
      setToast({ message: 'Incidencia reportada', variant: 'success' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'No fue posible reportar la incidencia'),
        variant: 'error',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reportar-incidencia-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="reportar-incidencia-title" className="mb-4 text-lg font-semibold text-gray-900">
          Reportar incidencia
        </h2>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="reportar-incidencia-tipo">Tipo</Label>
            <Select
              id="reportar-incidencia-tipo"
              aria-label="Tipo de incidencia"
              value={tipo}
              onValueChange={(value) => setTipo(value as TipoIncidencia)}
            >
              {TIPO_OPTIONS.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {TIPO_INCIDENCIA_LABEL[opcion]}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reportar-incidencia-descripcion">Descripción</Label>
            <textarea
              id="reportar-incidencia-descripcion"
              aria-label="Descripción de la incidencia"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="block w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void handleEnviar()} disabled={isPending}>
            {isPending ? 'Enviando...' : 'Reportar'}
          </Button>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default ReportarIncidencia;
