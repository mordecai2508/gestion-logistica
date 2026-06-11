import { Button } from '@/components/ui/button';
import type { UsuarioDto } from '@/types/usuarioTypes';

interface UsuarioDetalleProps {
  usuario: UsuarioDto;
  onClose: () => void;
}

export function UsuarioDetalle({ usuario, onClose }: UsuarioDetalleProps) {
  const fechaCreacion = new Date(usuario.createdAt).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      role="dialog"
      aria-label={`Detalle de ${usuario.nombre}`}
      className="space-y-4 p-6 border rounded-lg bg-white shadow"
    >
      <h2 className="text-lg font-semibold text-gray-900">Detalle del Usuario</h2>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</dt>
          <dd className="mt-1 text-sm text-gray-900">{usuario.nombre}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Correo</dt>
          <dd className="mt-1 text-sm text-gray-900">{usuario.correo}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</dt>
          <dd className="mt-1 text-sm text-gray-900">{usuario.rol}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</dt>
          <dd className="mt-1 text-sm text-gray-900">{usuario.telefono ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</dt>
          <dd className="mt-1">
            <span
              className={[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                usuario.activo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800',
              ].join(' ')}
            >
              {usuario.activo ? 'Activo' : 'Inactivo'}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de creación</dt>
          <dd className="mt-1 text-sm text-gray-900">{fechaCreacion}</dd>
        </div>
      </dl>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose} aria-label="Cerrar detalle">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
