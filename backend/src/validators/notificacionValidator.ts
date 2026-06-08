import { z } from 'zod';

export const listarNotificacionesSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive('page debe ser un entero positivo')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive('limit debe ser un entero positivo')),
});

export type ListarNotificacionesInput = z.infer<typeof listarNotificacionesSchema>;
