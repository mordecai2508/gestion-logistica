import { z } from 'zod';

export const userSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').optional(),
    telefono: z.string().min(1, 'El teléfono no puede estar vacío').optional(),
  })
  .refine((data) => data.nombre !== undefined || data.telefono !== undefined, {
    message: 'Debe proporcionar al menos nombre o teléfono',
  });

export type UpdatePerfilDto = z.infer<typeof userSchema>;

export const forgotPasswordSchema = z.object({
  correo: z.string().email('El correo debe tener un formato válido'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
