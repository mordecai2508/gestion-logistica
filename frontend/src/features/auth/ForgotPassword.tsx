import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const forgotPasswordSchema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.correo);
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Recuperar contraseña
          </CardTitle>
          <p className="text-sm text-gray-500">
            Ingresa tu correo para recibir el enlace de recuperación
          </p>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p
                role="status"
                className="text-sm text-green-700 bg-green-50 border border-green-300 rounded-md p-3"
              >
                Si el correo existe recibirás un enlace de recuperación en tu bandeja de entrada.
              </p>
              <div className="text-center text-sm">
                <Link
                  to="/login"
                  className="text-blue-600 hover:underline"
                  aria-label="Volver al login"
                >
                  Volver al login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar enlace'}
              </Button>

              <div className="text-center text-sm">
                <Link
                  to="/login"
                  className="text-blue-600 hover:underline"
                  aria-label="Volver al login"
                >
                  Volver al login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPassword;
