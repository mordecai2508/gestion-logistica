import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().email('El correo debe tener un formato válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    correo: z.string().email('El correo debe tener un formato válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'La confirmación de contraseña es requerida'),
    telefono: z.string().min(1, 'El teléfono es requerido'),
    rol: z.enum(['CLIENTE', 'OPERADOR', 'REPARTIDOR']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterDto = z.infer<typeof registerSchema>;
