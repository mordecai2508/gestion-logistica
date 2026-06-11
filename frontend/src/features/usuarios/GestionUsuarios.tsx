import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { UsuarioTable } from './UsuarioTable';
import { UsuarioDetalle } from './UsuarioDetalle';
import { useUsuarios } from '@/hooks/useUsuarios';
import type { UsuarioDto, Rol } from '@/types/usuarioTypes';

type RolFiltro = 'todos' | Rol;

const FILTROS: { value: RolFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'CLIENTE', label: 'CLIENTE' },
  { value: 'OPERADOR', label: 'OPERADOR' },
  { value: 'REPARTIDOR', label: 'REPARTIDOR' },
];

export function GestionUsuarios() {
  const [filtroRol, setFiltroRol] = useState<RolFiltro>('todos');
  const [page, setPage] = useState(1);
  const [usuarioVer, setUsuarioVer] = useState<UsuarioDto | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const filtros = {
    page,
    limit: 20,
    ...(filtroRol === 'todos' ? {} : { rol: filtroRol }),
  };

  const { data, isLoading, isError, refetch } = useUsuarios(filtros);

  const usuarios = data?.data ?? [];
  const meta = data?.meta;

  const handleFiltroChange = (value: RolFiltro) => {
    setFiltroRol(value);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {toast !== null && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-rol-select">Filtrar por rol</Label>
          <Select
            id="filtro-rol-select"
            value={filtroRol}
            onValueChange={(value) => handleFiltroChange(value as RolFiltro)}
            aria-label="Filtrar por rol"
            disabled={isLoading}
          >
            {FILTROS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 overflow-x-auto">
          {isLoading && (
            <p className="text-gray-500 text-center py-8" aria-busy="true">
              Cargando usuarios...
            </p>
          )}

          {isError && (
            <div className="text-center py-8 space-y-3">
              <p className="text-red-500" role="alert">
                Error al cargar los usuarios
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => { void refetch(); }}
                aria-label="Reintentar carga de usuarios"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <UsuarioTable
              usuarios={usuarios}
              onVer={(usuario) => setUsuarioVer(usuario)}
              onEstadoSuccess={(message) => setToast({ message, variant: 'success' })}
              onEstadoError={(message) => setToast({ message, variant: 'error' })}
            />
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Página {meta.page} de {meta.totalPages} — {meta.total} usuarios
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={meta.page <= 1}
                aria-label="Página anterior"
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                disabled={meta.page >= meta.totalPages}
                aria-label="Página siguiente"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {usuarioVer !== null && (
        <div className="mt-6">
          <UsuarioDetalle
            usuario={usuarioVer}
            onClose={() => setUsuarioVer(null)}
          />
        </div>
      )}
    </div>
  );
}
