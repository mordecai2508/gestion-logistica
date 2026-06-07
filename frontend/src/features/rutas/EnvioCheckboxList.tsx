import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EnvioOrdenadoDto } from '@/types/rutaTypes';

interface EnvioItem {
  id: string;
  codigoSeguimiento: string;
  direccionDestino: string;
}

interface EnvioCheckboxListProps {
  envios: EnvioItem[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  orderedEnvios?: EnvioOrdenadoDto[];
}

export function EnvioCheckboxList({
  envios,
  selectedIds,
  onChange,
  orderedEnvios,
}: EnvioCheckboxListProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // If we have an ordered list from optimal route, show in that order
  const displayList = orderedEnvios
    ? orderedEnvios.map((p) => ({
        id: p.envioId,
        codigoSeguimiento: p.codigoSeguimiento,
        direccionDestino: p.direccionDestino,
        orden: p.orden,
      }))
    : envios.map((e) => ({ ...e, orden: undefined }));

  return (
    <div className="space-y-2">
      {displayList.map((envio) => (
        <div key={envio.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
          <Checkbox
            id={`envio-${envio.id}`}
            checked={selectedIds.includes(envio.id)}
            onChange={() => handleToggle(envio.id)}
            aria-label={`Seleccionar envío ${envio.codigoSeguimiento}`}
          />
          <Label htmlFor={`envio-${envio.id}`} className="flex-1 cursor-pointer">
            <span className="font-mono text-sm font-medium">{envio.codigoSeguimiento}</span>
            {envio.orden !== undefined && (
              <span className="ml-2 text-xs text-blue-600 font-semibold">#{envio.orden}</span>
            )}
            <span className="block text-xs text-gray-500">{envio.direccionDestino}</span>
          </Label>
        </div>
      ))}
      {displayList.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No hay envíos disponibles</p>
      )}
    </div>
  );
}
