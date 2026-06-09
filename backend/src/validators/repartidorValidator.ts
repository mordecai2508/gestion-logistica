import { z } from 'zod';

export const listarRepartidoresSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive('page debe ser un entero positivo')
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit debe ser al menos 1')
    .max(100, 'limit no puede ser mayor a 100')
    .default(20),
  disponible: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ListarRepartidoresQuery = z.infer<typeof listarRepartidoresSchema>;

export const repartidorIdParamSchema = z.object({
  id: z.string().min(1, 'El id es requerido'),
});

export const actualizarRepartidorSchema = z
  .object({
    disponible: z.boolean().optional(),
    licencia: z.string().trim().min(1, 'La licencia no puede estar vacía').max(50, 'La licencia no puede superar 50 caracteres').optional(),
  })
  .refine(
    (data) => data.disponible !== undefined || data.licencia !== undefined,
    { message: 'Se requiere al menos un campo: disponible o licencia' },
  );

export type ActualizarRepartidorInput = z.infer<typeof actualizarRepartidorSchema>;
