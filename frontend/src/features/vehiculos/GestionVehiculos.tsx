import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { VehiculoTable } from './VehiculoTable';
import { VehiculoForm } from './VehiculoForm';
import { ActualizarEstadoVehiculo } from './ActualizarEstadoVehiculo';
import { useVehiculos } from '@/hooks/useVehiculos';
import type { VehiculoDto, EstadoVehiculo } from '@/types/vehiculoTypes';

const FILTROS_ESTADO: { value: EstadoVehiculo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'EN_RUTA', label: 'Ocupado' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'FUERA_SERVICIO', label: 'Fuera de servicio' },
];

export function GestionVehiculos() {
  const [showForm, setShowForm] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVehiculo | ''>('');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoDto | null>(null);

  const filtros = estadoFiltro === '' ? {} : { estado: estadoFiltro };
  const { data, isLoading, isError } = useVehiculos(filtros);

  const vehiculos = data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-estado-select">Filtrar por estado</Label>
          <Select
            id="filtro-estado-select"
            value={estadoFiltro}
            onValueChange={(value) => setEstadoFiltro(value as EstadoVehiculo | '')}
            aria-label="Filtrar por estado"
          >
            {FILTROS_ESTADO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 overflow-x-auto">
          {isLoading && <p className="text-gray-500 text-center py-8">Cargando vehículos...</p>}

          {isError && (
            <p className="text-red-500 text-center py-8" role="alert">
              Error al cargar los vehículos
            </p>
          )}

          {!isLoading && !isError && (
            <VehiculoTable
              vehiculos={vehiculos}
              onActualizarEstado={(vehiculo) => setVehiculoSeleccionado(vehiculo)}
            />
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <Button
            onClick={() => setShowForm((prev) => !prev)}
            aria-label={showForm ? 'Cerrar formulario de registro' : '+ Registrar Vehículo'}
          >
            {showForm ? 'Cancelar' : '+ Registrar Vehículo'}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mt-6 p-6 border rounded-lg bg-white shadow">
          <h2 className="text-lg font-semibold mb-4">Registrar Vehículo</h2>
          <VehiculoForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {vehiculoSeleccionado && (
        <div className="mt-6">
          <ActualizarEstadoVehiculo
            vehiculo={vehiculoSeleccionado}
            onClose={() => setVehiculoSeleccionado(null)}
          />
        </div>
      )}
    </div>
  );
}
