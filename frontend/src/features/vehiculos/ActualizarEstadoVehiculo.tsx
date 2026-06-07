import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { useActualizarEstadoVehiculo } from '@/hooks/useActualizarEstadoVehiculo';
import type { VehiculoDto, EstadoVehiculo } from '@/types/vehiculoTypes';

const ESTADOS: { value: EstadoVehiculo; label: string }[] = [
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'EN_RUTA', label: 'Ocupado' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'FUERA_SERVICIO', label: 'Fuera de servicio' },
];

interface ActualizarEstadoVehiculoProps {
  vehiculo: VehiculoDto;
  onClose?: () => void;
}

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

export function ActualizarEstadoVehiculo({ vehiculo, onClose }: ActualizarEstadoVehiculoProps) {
  const [estado, setEstado] = useState<EstadoVehiculo>(vehiculo.estado);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const actualizarEstado = useActualizarEstadoVehiculo();

  const handleConfirmar = async () => {
    try {
      const actualizado = await actualizarEstado.mutateAsync({ id: vehiculo.id, estado });
      setToast({
        message: `Estado de ${actualizado.placa} actualizado a ${actualizado.estado}`,
        variant: 'success',
      });
      onClose?.();
    } catch (err: unknown) {
      setToast({
        message: extraerMensajeError(err, 'Error al actualizar el estado del vehículo'),
        variant: 'error',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`Actualizar estado de ${vehiculo.placa}`}
      className="space-y-4 p-4 border rounded-lg bg-white shadow"
    >
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <p className="text-sm text-gray-600">
        Vehículo: <span className="font-mono font-medium">{vehiculo.placa}</span> — {vehiculo.modelo}
      </p>

      <div className="space-y-1">
        <Label htmlFor="nuevo-estado-select">Nuevo estado</Label>
        <Select
          id="nuevo-estado-select"
          value={estado}
          onValueChange={(value) => setEstado(value as EstadoVehiculo)}
          aria-label="Seleccionar nuevo estado"
        >
          {ESTADOS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={() => { void handleConfirmar(); }}
          disabled={actualizarEstado.isPending}
          aria-label="Confirmar cambio de estado"
        >
          {actualizarEstado.isPending ? 'Guardando...' : 'Confirmar'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} aria-label="Cancelar cambio de estado">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
