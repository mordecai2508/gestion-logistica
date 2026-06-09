import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';
import { useActualizarRepartidor } from '@/hooks/useRepartidores';
import type { RepartidorDto } from '@/types/repartidorTypes';

interface EditarRepartidorProps {
  repartidor: RepartidorDto;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

export function EditarRepartidor({ repartidor, onClose, onSuccess }: EditarRepartidorProps) {
  const [disponible, setDisponible] = useState<boolean>(repartidor.disponible);
  const [licencia, setLicencia] = useState<string>(repartidor.licencia ?? '');
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const actualizarRepartidor = useActualizarRepartidor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto: { disponible?: boolean; licencia?: string } = {};

    if (disponible !== repartidor.disponible) {
      dto.disponible = disponible;
    }

    const licenciaTrim = licencia.trim();
    if (licenciaTrim !== (repartidor.licencia ?? '')) {
      if (licenciaTrim.length === 0) {
        setToast({ message: 'La licencia no puede estar vacía si se modifica', variant: 'error' });
        return;
      }
      dto.licencia = licenciaTrim;
    }

    if (Object.keys(dto).length === 0) {
      setToast({ message: 'No se realizaron cambios', variant: 'error' });
      return;
    }

    try {
      await actualizarRepartidor.mutateAsync({ id: repartidor.id, dto });
      const successMsg = 'Repartidor actualizado exitosamente';
      if (onSuccess !== undefined) {
        onSuccess(successMsg);
      } else {
        setToast({ message: successMsg, variant: 'success' });
      }
      onClose();
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'Error al actualizar el repartidor'),
        variant: 'error',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`Editar ${repartidor.usuario.nombre}`}
      className="space-y-4 p-6 border rounded-lg bg-white shadow"
    >
      <h2 className="text-lg font-semibold text-gray-900">Editar Repartidor</h2>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <p className="text-sm text-gray-600">
        Repartidor: <span className="font-medium">{repartidor.usuario.nombre}</span>
      </p>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="editar-licencia">Licencia</Label>
          <input
            id="editar-licencia"
            type="text"
            value={licencia}
            onChange={(e) => setLicencia(e.target.value)}
            maxLength={50}
            placeholder="Número de licencia"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Licencia de conducción"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="editar-disponible"
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Disponible para entregas"
          />
          <Label htmlFor="editar-disponible">Disponible para entregas</Label>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={actualizarRepartidor.isPending}
            aria-label="Guardar cambios del repartidor"
          >
            {actualizarRepartidor.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} aria-label="Cancelar edición">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
