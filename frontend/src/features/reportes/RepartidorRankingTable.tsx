import type { RepartidorRankingDto } from '@/types/reportes';

interface RepartidorRankingTableProps {
  data: RepartidorRankingDto[];
  isLoading: boolean;
}

export function RepartidorRankingTable({ data, isLoading }: RepartidorRankingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded bg-gray-200"
            role="status"
            aria-label="Cargando ranking de repartidores"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">Sin repartidores para mostrar</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Posición</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
          <th className="px-4 py-3 text-right font-medium text-gray-600">Entregados</th>
          <th className="px-4 py-3 text-right font-medium text-gray-600">Fallidos</th>
        </tr>
      </thead>
      <tbody>
        {data.map((rep, index) => (
          <tr key={rep.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3 font-semibold text-gray-500">#{index + 1}</td>
            <td className="px-4 py-3">{rep.nombre}</td>
            <td className="px-4 py-3 text-right text-green-700 font-semibold">
              {rep.totalEntregados}
            </td>
            <td className="px-4 py-3 text-right text-red-600 font-semibold">
              {rep.totalFallidos}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
