import type { RepartidorDto } from '@/types/repartidorTypes';

interface RepartidorTableProps {
  repartidores: RepartidorDto[];
  onVer: (repartidor: RepartidorDto) => void;
  onEditar: (repartidor: RepartidorDto) => void;
}

function DisponibilidadBadge({ disponible }: { disponible: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        disponible
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800',
      ].join(' ')}
      aria-label={disponible ? 'Disponible' : 'No disponible'}
    >
      {disponible ? 'Disponible' : 'No disponible'}
    </span>
  );
}

export function RepartidorTable({ repartidores, onVer, onEditar }: RepartidorTableProps) {
  if (repartidores.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No se encontraron repartidores.</p>
    );
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="border-b">
        <tr>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Nombre</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Correo</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Teléfono</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Licencia</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Disponibilidad</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {repartidores.map((rep) => (
          <tr key={rep.id} className="border-b last:border-0 hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-900">{rep.usuario.nombre}</td>
            <td className="px-4 py-3 text-gray-700">{rep.usuario.correo}</td>
            <td className="px-4 py-3 text-gray-700">{rep.usuario.telefono ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700 font-mono">{rep.licencia ?? '—'}</td>
            <td className="px-4 py-3">
              <DisponibilidadBadge disponible={rep.disponible} />
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onVer(rep)}
                  aria-label={`Ver detalle de ${rep.usuario.nombre}`}
                  className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => onEditar(rep)}
                  aria-label={`Editar ${rep.usuario.nombre}`}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Editar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
