import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';
import { useCrearVehiculo } from '@/hooks/useCrearVehiculo';

const crearVehiculoSchemaFrontend = z.object({
  placa: z.string().trim().min(1, 'La placa es requerida'),
  modelo: z.string().trim().min(1, 'El modelo es requerido'),
  capacidad: z
    .number({ message: 'La capacidad debe ser un número' })
    .gt(0, 'La capacidad debe ser un número positivo'),
});

type VehiculoFormData = z.infer<typeof crearVehiculoSchemaFrontend>;

interface VehiculoFormProps {
  onSuccess?: () => void;
}

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    axiosErr?.response?.data?.message ??
    axiosErr?.message ??
    fallback
  );
}

function esErrorDePlacaDuplicada(err: unknown): boolean {
  const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
  return (
    axiosErr?.response?.status === 409 ||
    axiosErr?.response?.data?.error === 'PLACA_DUPLICADA'
  );
}

export function VehiculoForm({ onSuccess }: VehiculoFormProps) {
  const { mutateAsync, isPending } = useCrearVehiculo();
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);
  const [placaDuplicadaError, setPlacaDuplicadaError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehiculoFormData>({
    resolver: zodResolver(crearVehiculoSchemaFrontend),
  });

  const onSubmit = async (data: VehiculoFormData) => {
    setPlacaDuplicadaError(null);
    try {
      const vehiculo = await mutateAsync(data);
      setToast({ message: `Vehículo ${vehiculo.placa} registrado exitosamente`, variant: 'success' });
      onSuccess?.();
    } catch (err: unknown) {
      if (esErrorDePlacaDuplicada(err)) {
        // R20: mostrar mensaje inline de placa duplicada sin limpiar el resto del formulario
        setPlacaDuplicadaError(extraerMensajeError(err, 'La placa ya está registrada'));
        return;
      }
      setToast({ message: extraerMensajeError(err, 'Error al registrar el vehículo'), variant: 'error' });
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      noValidate
      className="space-y-4"
      aria-label="Formulario de registro de vehículo"
    >
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <div className="space-y-1">
        <Label htmlFor="placa">Placa</Label>
        <Input
          id="placa"
          type="text"
          placeholder="ABC-123"
          aria-label="Placa"
          aria-invalid={!!(errors.placa ?? placaDuplicadaError)}
          {...register('placa')}
        />
        {errors.placa && (
          <p className="text-xs text-red-600" role="alert">{errors.placa.message}</p>
        )}
        {placaDuplicadaError && (
          <p className="text-xs text-red-600" role="alert">{placaDuplicadaError}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="modelo">Modelo</Label>
        <Input
          id="modelo"
          type="text"
          placeholder="Toyota Hilux"
          aria-label="Modelo"
          aria-invalid={!!errors.modelo}
          {...register('modelo')}
        />
        {errors.modelo && (
          <p className="text-xs text-red-600" role="alert">{errors.modelo.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="capacidad">Capacidad (kg)</Label>
        <Input
          id="capacidad"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="1000"
          aria-label="Capacidad"
          aria-invalid={!!errors.capacidad}
          {...register('capacidad', { valueAsNumber: true })}
        />
        {errors.capacidad && (
          <p className="text-xs text-red-600" role="alert">{errors.capacidad.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} aria-label="Registrar vehículo">
        {isPending ? 'Registrando...' : 'Registrar Vehículo'}
      </Button>
    </form>
  );
}
