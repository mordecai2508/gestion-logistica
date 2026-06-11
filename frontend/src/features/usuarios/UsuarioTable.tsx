import { useActualizarEstadoUsuario } from '@/hooks/useUsuarios';
import type { UsuarioDto } from '@/types/usuarioTypes';

interface UsuarioTableProps {
  usuarios: UsuarioDto[];
  onVer: (usuario: UsuarioDto) => void;
  onEstadoSuccess?: (message: string) => void;
  onEstadoError?: (message: string) => void;
}

function extraerMensajeError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return axiosErr?.response?.data?.message ?? axiosErr?.message ?? fallback;
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        activo
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800',
      ].join(' ')}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function UsuarioTable({ usuarios, onVer, onEstadoSuccess, onEstadoError }: UsuarioTableProps) {
  const actualizarEstado = useActualizarEstadoUsuario();

  if (usuarios.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No se encontraron usuarios.</p>
    );
  }

  const handleToggleEstado = async (usuario: UsuarioDto) => {
    try {
      const actualizado = await actualizarEstado.mutateAsync({
        id: usuario.id,
        dto: { activo: !usuario.activo },
      });
      onEstadoSuccess?.(
        actualizado.activo
          ? `${actualizado.nombre} fue activado correctamente`
          : `${actualizado.nombre} fue desactivado correctamente`,
      );
    } catch (err: unknown) {
      onEstadoError?.(extraerMensajeError(err, 'Error al actualizar el estado del usuario'));
    }
  };

  return (
    <table className="w-full text-sm text-left">
      <thead className="border-b">
        <tr>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Nombre</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Correo</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Rol</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Estado</th>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((usuario) => (
          <tr key={usuario.id} className="border-b last:border-0 hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-900">{usuario.nombre}</td>
            <td className="px-4 py-3 text-gray-700">{usuario.correo}</td>
            <td className="px-4 py-3 text-gray-700">{usuario.rol}</td>
            <td className="px-4 py-3">
              <EstadoBadge activo={usuario.activo} />
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onVer(usuario)}
                  aria-label={`Ver detalle de ${usuario.nombre}`}
                  className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => { void handleToggleEstado(usuario); }}
                  disabled={actualizarEstado.isPending}
                  aria-label={`${usuario.activo ? 'Desactivar' : 'Activar'} ${usuario.nombre}`}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {usuario.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
