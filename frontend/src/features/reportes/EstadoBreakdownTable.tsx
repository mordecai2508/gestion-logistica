const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-800',
  EN_PREPARACION: 'bg-yellow-100 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-800',
  EN_RUTA: 'bg-blue-100 text-blue-800',
};

interface EstadoBreakdownTableProps {
  data: { estado: string; total: number }[];
}

export function EstadoBreakdownTable({ data }: EstadoBreakdownTableProps) {
  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">Sin datos para mostrar</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
          <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.estado} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[row.estado] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {row.estado}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
