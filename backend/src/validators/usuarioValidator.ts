import { z } from 'zod';

export const listarUsuariosSchema = z.object({
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
  rol: z
    .enum(['CLIENTE', 'OPERADOR', 'REPARTIDOR'])
    .optional(),
});

export type ListarUsuariosQuery = z.infer<typeof listarUsuariosSchema>;

export const usuarioIdParamSchema = z.object({
  id: z.string().min(1, 'El id es requerido'),
});

export const actualizarEstadoUsuarioSchema = z
  .object({
    activo: z.boolean(),
  })
  .strict();

export type ActualizarEstadoUsuarioInput = z.infer<typeof actualizarEstadoUsuarioSchema>;
