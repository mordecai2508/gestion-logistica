import type { EnvioRecienteDto, EstadoEnvio } from '@/types/dashboard';

interface EnviosRecientesTableProps {
  envios: EnvioRecienteDto[];
}

const ESTADO_BADGE: Record<EstadoEnvio, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  EN_PREPARACION: { label: 'En Preparación', className: 'bg-blue-100 text-blue-700' },
  EN_TRANSITO: { label: 'En Tránsito', className: 'bg-indigo-100 text-indigo-800' },
  EN_RUTA: { label: 'En Ruta', className: 'bg-blue-200 text-blue-900' },
  ENTREGADO: { label: 'Entregado', className: 'bg-green-100 text-green-800' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
  FALLIDO: { label: 'Fallido', className: 'bg-gray-100 text-gray-700' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function EnviosRecientesTable({ envios }: EnviosRecientesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Código</th>
            <th className="pb-2 pr-4 font-medium">Cliente</th>
            <th className="pb-2 pr-4 font-medium">Estado</th>
            <th className="pb-2 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {envios.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-400">
                Sin envíos recientes
              </td>
            </tr>
          ) : (
            envios.map((envio) => {
              const badge = ESTADO_BADGE[envio.estado] ?? {
                label: envio.estado,
                className: 'bg-gray-100 text-gray-700',
              };
              return (
                <tr key={envio.codigoSeguimiento} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{envio.codigoSeguimiento}</td>
                  <td className="py-2 pr-4">{envio.clienteNombre}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{formatDate(envio.createdAt)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
