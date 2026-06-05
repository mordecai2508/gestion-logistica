import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { Select, SelectItem } from '@/components/ui/select';

const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    correo: z.string().email('Correo inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'La confirmación es requerida'),
    telefono: z.string().min(1, 'El teléfono es requerido'),
    rol: z.enum(['CLIENTE', 'OPERADOR', 'REPARTIDOR']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function Register() {
  const { registerMutation } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { rol: 'CLIENTE' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      await registerMutation.mutateAsync(data);
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            statusCode?: number;
            error?: string;
            issues?: Array<{ path: string[]; message: string }>;
          };
        };
        message?: string;
      };

      const status = axiosErr?.response?.status;
      const responseData = axiosErr?.response?.data;

      if (status === 409) {
        setErrorMessage(responseData?.message ?? 'El correo ya está registrado');
      } else if (status === 422) {
        const issues = responseData?.issues;
        if (issues && Array.isArray(issues)) {
          issues.forEach((issue) => {
            const fieldPath = issue.path?.[0] as keyof RegisterFormData | undefined;
            if (fieldPath) {
              setError(fieldPath, { message: issue.message });
            }
          });
        } else {
          setErrorMessage(responseData?.message ?? 'Error de validación');
        }
      } else {
        setErrorMessage(
          axiosErr?.response?.data?.message ??
            axiosErr?.message ??
            'Error al registrarse. Intente de nuevo.',
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600"
            aria-label="Logo"
          >
            <span className="text-2xl font-bold text-white">GL</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Crear cuenta</CardTitle>
          <p className="text-sm text-gray-500">Completa los datos para registrarte</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Nombre field */}
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Tu nombre completo"
                autoComplete="name"
                aria-label="Nombre completo"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            {/* Correo field */}
            <div className="space-y-1">
              <Label htmlFor="correo">Correo electrónico</Label>
              <Input
                id="correo"
                type="email"
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                aria-label="Correo electrónico"
                {...register('correo')}
              />
              {errors.correo && (
                <p className="text-xs text-red-600">{errors.correo.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-label="Contraseña"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-label="Confirmar contraseña"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Teléfono field */}
            <div className="space-y-1">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="3001234567"
                autoComplete="tel"
                aria-label="Teléfono"
                {...register('telefono')}
              />
              {errors.telefono && (
                <p className="text-xs text-red-600">{errors.telefono.message}</p>
              )}
            </div>

            {/* Rol field */}
            <div className="space-y-1">
              <Label htmlFor="rol">Rol</Label>
              <Controller
                name="rol"
                control={control}
                render={({ field }) => (
                  <Select
                    id="rol"
                    aria-label="Rol"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                    <SelectItem value="REPARTIDOR">Repartidor</SelectItem>
                  </Select>
                )}
              />
              {errors.rol && (
                <p className="text-xs text-red-600">{errors.rol.message}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registrando...' : 'REGISTRARSE'}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-4 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:underline font-medium"
              aria-label="Inicia sesión"
            >
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Toast error notification */}
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

export default Register;
