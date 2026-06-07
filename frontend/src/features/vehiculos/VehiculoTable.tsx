import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { VehiculoDto, EstadoVehiculo } from '@/types/vehiculoTypes';

interface VehiculoTableProps {
  vehiculos: VehiculoDto[];
  onActualizarEstado: (vehiculo: VehiculoDto) => void;
}

const estadoBadgeClass: Record<EstadoVehiculo, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800',
  EN_RUTA: 'bg-orange-100 text-orange-800',
  MANTENIMIENTO: 'bg-red-100 text-red-800',
  FUERA_SERVICIO: 'bg-gray-200 text-gray-700',
};

const estadoLabel: Record<EstadoVehiculo, string> = {
  DISPONIBLE: 'Disponible',
  EN_RUTA: 'Ocupado',
  MANTENIMIENTO: 'Mantenimiento',
  FUERA_SERVICIO: 'Fuera de servicio',
};

export function VehiculoTable({ vehiculos, onActualizarEstado }: VehiculoTableProps) {
  return (
    <table className="w-full border-collapse text-sm" aria-label="Tabla de vehículos">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-2 pr-4 font-medium">Placa</th>
          <th className="py-2 pr-4 font-medium">Modelo</th>
          <th className="py-2 pr-4 font-medium">Capacidad</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {vehiculos.map((vehiculo) => (
          <tr key={vehiculo.id} className="border-b last:border-0" aria-label={`Vehículo ${vehiculo.placa}`}>
            <td className="py-2 pr-4 font-mono">{vehiculo.placa}</td>
            <td className="py-2 pr-4">{vehiculo.modelo}</td>
            <td className="py-2 pr-4">{vehiculo.capacidad}</td>
            <td className="py-2 pr-4">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  estadoBadgeClass[vehiculo.estado] ?? 'bg-gray-100 text-gray-800',
                )}
              >
                {estadoLabel[vehiculo.estado] ?? vehiculo.estado}
              </span>
            </td>
            <td className="py-2 pr-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onActualizarEstado(vehiculo)}
                aria-label={`Actualizar estado de ${vehiculo.placa}`}
              >
                Actualizar Estado
              </Button>
            </td>
          </tr>
        ))}
        {vehiculos.length === 0 && (
          <tr>
            <td colSpan={5} className="py-8 text-center text-gray-400">
              No hay vehículos registrados
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
