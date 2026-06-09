import { useNavigate } from 'react-router-dom';
import type { RutaPendienteDto } from '@/types/dashboard';

interface RutasPendientesPanelProps {
  rutas: RutaPendienteDto[];
}

export function RutasPendientesPanel({ rutas }: RutasPendientesPanelProps) {
  const navigate = useNavigate();

  return (
    <ul className="divide-y">
      {rutas.length === 0 ? (
        <li className="py-6 text-center text-sm text-gray-400">Sin rutas pendientes</li>
      ) : (
        rutas.map((ruta) => (
          <li key={ruta.id} className="flex items-center justify-between py-3">
            <span className="font-mono text-sm font-medium text-gray-800">{ruta.codigo}</span>
            <button
              onClick={() => navigate(`/rutas/${ruta.id}`)}
              aria-label={`Ver ruta ${ruta.codigo}`}
              className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              &#8594;
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
