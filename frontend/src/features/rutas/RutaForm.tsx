import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { EnvioCheckboxList } from './EnvioCheckboxList';
import { useCrearRuta } from '@/hooks/useCrearRuta';
import { useRutaOptima } from '@/hooks/useRutaOptima';
import type { EnvioOrdenadoDto, VehiculoDto, RepartidorDto } from '@/types/rutaTypes';

interface EnvioDisponible {
  id: string;
  codigoSeguimiento: string;
  direccionDestino: string;
}

interface RutaFormProps {
  enviosDisponibles: EnvioDisponible[];
  vehiculosDisponibles: VehiculoDto[];
  repartidoresDisponibles: RepartidorDto[];
  onSuccess?: () => void;
}

interface FormErrors {
  enviosIds?: string;
  vehiculoId?: string;
  repartidorId?: string;
}

export function RutaForm({
  enviosDisponibles,
  vehiculosDisponibles,
  repartidoresDisponibles,
  onSuccess,
}: RutaFormProps) {
  const [selectedEnviosIds, setSelectedEnviosIds] = useState<string[]>([]);
  const [vehiculoId, setVehiculoId] = useState('');
  const [repartidorId, setRepartidorId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [orderedEnvios, setOrderedEnvios] = useState<EnvioOrdenadoDto[] | undefined>(undefined);

  const crearRuta = useCrearRuta();
  const rutaOptima = useRutaOptima(rutaId ?? '');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (selectedEnviosIds.length === 0) {
      newErrors.enviosIds = 'Selecciona al menos un envío';
    }
    if (!vehiculoId) {
      newErrors.vehiculoId = 'Selecciona un vehículo';
    }
    if (!repartidorId) {
      newErrors.repartidorId = 'Selecciona un repartidor';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerarOptima = async () => {
    if (!rutaId) {
      setToast({ message: 'Primero debes guardar la ruta para generar la ruta óptima', variant: 'error' });
      return;
    }
    try {
      const result = await rutaOptima.refetch();
      if (result.data) {
        setOrderedEnvios(result.data.paradas);
        if (result.data.advertencia) {
          setToast({ message: result.data.advertencia, variant: 'error' });
        }
      }
    } catch {
      setToast({ message: 'Error al calcular la ruta óptima', variant: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const ruta = await crearRuta.mutateAsync({
        enviosIds: selectedEnviosIds,
        vehiculoId,
        repartidorId,
      });
      setRutaId(ruta.id);
      setToast({ message: `Ruta ${ruta.codigo} creada exitosamente`, variant: 'success' });
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la ruta';
      setToast({ message, variant: 'error' });
    }
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6" aria-label="Formulario de ruta">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {rutaId && (
        <div className="p-3 bg-gray-100 rounded">
          <span className="text-sm font-medium text-gray-600">Ruta ID:</span>
          <span className="ml-2 font-mono text-sm">{rutaId}</span>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="vehiculo-select">Vehículo</Label>
        <Select
          id="vehiculo-select"
          value={vehiculoId}
          onValueChange={setVehiculoId}
          aria-label="Seleccionar vehículo"
          aria-invalid={!!errors.vehiculoId}
        >
          <option value="">-- Seleccionar vehículo --</option>
          {vehiculosDisponibles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa} — {v.modelo}
            </option>
          ))}
        </Select>
        {errors.vehiculoId && (
          <p className="text-sm text-red-600" role="alert">{errors.vehiculoId}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="repartidor-select">Repartidor</Label>
        <Select
          id="repartidor-select"
          value={repartidorId}
          onValueChange={setRepartidorId}
          aria-label="Seleccionar repartidor"
          aria-invalid={!!errors.repartidorId}
        >
          <option value="">-- Seleccionar repartidor --</option>
          {repartidoresDisponibles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.usuario.nombre}
            </option>
          ))}
        </Select>
        {errors.repartidorId && (
          <p className="text-sm text-red-600" role="alert">{errors.repartidorId}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Envíos</Label>
        <EnvioCheckboxList
          envios={enviosDisponibles}
          selectedIds={selectedEnviosIds}
          onChange={setSelectedEnviosIds}
          orderedEnvios={orderedEnvios}
        />
        {errors.enviosIds && (
          <p className="text-sm text-red-600" role="alert">{errors.enviosIds}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => { void handleGenerarOptima(); }}
          disabled={rutaOptima.isFetching}
          aria-label="Generar ruta óptima"
        >
          {rutaOptima.isFetching ? 'Calculando...' : 'GENERAR RUTA ÓPTIMA'}
        </Button>

        <Button
          type="submit"
          disabled={crearRuta.isPending}
          aria-label="Guardar ruta"
        >
          {crearRuta.isPending ? 'Guardando...' : 'Guardar Ruta'}
        </Button>
      </div>
    </form>
  );
}
