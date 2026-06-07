import { z } from 'zod';

export const crearRutaSchema = z.object({
  enviosIds: z
    .array(z.string().cuid('Cada envioId debe ser un cuid válido'))
    .min(1, 'Se requiere al menos un envío'),
  vehiculoId: z.string().cuid('El vehiculoId debe ser un cuid válido'),
  repartidorId: z.string().cuid('El repartidorId debe ser un cuid válido'),
});

export type CrearRutaInput = z.infer<typeof crearRutaSchema>;

export const reasignarRutaSchema = z
  .object({
    repartidorId: z.string().cuid('El repartidorId debe ser un cuid válido').optional(),
    vehiculoId: z.string().cuid('El vehiculoId debe ser un cuid válido').optional(),
  })
  .refine(
    (data) => data.repartidorId !== undefined || data.vehiculoId !== undefined,
    { message: 'Se requiere al menos un campo: repartidorId o vehiculoId' },
  );

export type ReasignarRutaInput = z.infer<typeof reasignarRutaSchema>;

export const listarRutasSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive('page debe ser un entero positivo')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive('limit debe ser un entero positivo').max(100, 'limit máximo es 100')),
  repartidorId: z.string().optional(),
});

export type ListarRutasInput = z.infer<typeof listarRutasSchema>;
