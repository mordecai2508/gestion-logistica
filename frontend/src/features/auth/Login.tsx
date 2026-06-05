import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Toast } from '@/components/ui/toast';

const loginSchema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  recordarme: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const { loginMutation } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { recordarme: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await loginMutation.mutateAsync({ correo: data.correo, password: data.password });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        'Error al iniciar sesión. Intente de nuevo.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600" aria-label="Logo">
            <span className="text-2xl font-bold text-white">GL</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Gestión Logística
          </CardTitle>
          <p className="text-sm text-gray-500">Inicia sesión en tu cuenta</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Correo field */}
            <div className="space-y-1">
              <Label htmlFor="correo">Correo electrónico</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input
                  id="correo"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  className="pl-10"
                  autoComplete="email"
                  aria-label="Correo electrónico"
                  {...register('correo')}
                />
              </div>
              {errors.correo && (
                <p className="text-xs text-red-600">{errors.correo.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  autoComplete="current-password"
                  aria-label="Contraseña"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Recordarme checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="recordarme"
                aria-label="Recordarme"
                {...register('recordarme')}
              />
              <Label htmlFor="recordarme" className="cursor-pointer font-normal">
                Recordarme
              </Label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-4 space-y-2 text-center text-sm">
            <div>
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:underline"
                aria-label="¿Olvidó su contraseña?"
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <div className="text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:underline font-medium"
                aria-label="Registrarse"
              >
                Registrarse
              </Link>
            </div>
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

export default Login;
