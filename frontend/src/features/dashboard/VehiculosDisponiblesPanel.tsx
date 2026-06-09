import type { VehiculoDisponibleDto } from '@/types/dashboard';

interface VehiculosDisponiblesPanelProps {
  vehiculos: VehiculoDisponibleDto[];
}

export function VehiculosDisponiblesPanel({ vehiculos }: VehiculosDisponiblesPanelProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Placa</th>
            <th className="pb-2 pr-4 font-medium">Modelo</th>
            <th className="pb-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {vehiculos.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-400">
                Sin vehículos disponibles
              </td>
            </tr>
          ) : (
            vehiculos.map((vehiculo) => (
              <tr key={vehiculo.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{vehiculo.placa}</td>
                <td className="py-2 pr-4">{vehiculo.modelo}</td>
                <td className="py-2">
                  <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Disponible
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
