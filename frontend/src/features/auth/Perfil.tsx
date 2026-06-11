import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { usePerfil } from '@/hooks/usePerfil';
import { useUpdatePerfil } from '@/hooks/useUpdatePerfil';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

const updatePerfilSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').optional(),
    telefono: z.string().min(1, 'El teléfono no puede estar vacío').optional(),
  })
  .refine((data) => data.nombre !== undefined || data.telefono !== undefined, {
    message: 'Debe proporcionar al menos nombre o teléfono',
  });

type UpdatePerfilFormData = z.infer<typeof updatePerfilSchema>;

export function Perfil() {
  const { data: perfil, isPending: isLoadingPerfil } = usePerfil();
  const updatePerfilMutation = useUpdatePerfil();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePerfilFormData>({
    resolver: zodResolver(updatePerfilSchema),
    values: {
      nombre: perfil?.nombre ?? '',
      telefono: perfil?.telefono ?? '',
    },
  });

  const onSubmit = async (data: UpdatePerfilFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updatePerfilMutation.mutateAsync(data);
      setSuccessMessage('Perfil actualizado correctamente');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        'Error al actualizar el perfil. Intente de nuevo.';
      setErrorMessage(msg);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // logout failure should not prevent local auth cleanup
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  if (isLoadingPerfil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p aria-label="Cargando perfil">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Mi Perfil</CardTitle>
          <p className="text-sm text-gray-500">Gestiona tu información personal</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Rol badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Rol:</span>
            <span
              aria-label="Rol"
              className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
            >
              {perfil?.rol}
            </span>
          </div>

          {/* Correo (read-only) */}
          <div className="space-y-1">
            <Label htmlFor="correo">Correo electrónico</Label>
            <Input
              id="correo"
              type="email"
              value={perfil?.correo ?? ''}
              disabled
              aria-label="Correo electrónico"
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Nombre field */}
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Tu nombre completo"
                aria-label="Nombre completo"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            {/* Teléfono field */}
            <div className="space-y-1">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="3001234567"
                aria-label="Teléfono"
                {...register('telefono')}
              />
              {errors.telefono && (
                <p className="text-xs text-red-600">{errors.telefono.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-xs text-red-600">{errors.root.message}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || updatePerfilMutation.isPending}
            >
              {updatePerfilMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>

          <div className="mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void handleLogout();
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {errorMessage && (
        <Toast
          message={errorMessage}
          variant="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}

export default Perfil;
