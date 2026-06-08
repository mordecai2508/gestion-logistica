import { z } from 'zod';
import { TipoIncidencia, EstadoIncidencia } from '@prisma/client';

const tipoIncidenciaValues = Object.values(TipoIncidencia) as [TipoIncidencia, ...TipoIncidencia[]];
const estadoIncidenciaValues = Object.values(EstadoIncidencia) as [
  EstadoIncidencia,
  ...EstadoIncidencia[],
];

export const crearIncidenciaSchema = z.object({
  envioId: z.string().cuid('El envioId debe ser un cuid válido'),
  tipo: z.enum(tipoIncidenciaValues, { error: 'tipo debe ser un valor válido de TipoIncidencia' }),
  descripcion: z.string().min(1, 'La descripción es requerida'),
});

export type CrearIncidenciaInput = z.infer<typeof crearIncidenciaSchema>;

export const listarIncidenciasSchema = z.object({
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
  tipo: z
    .enum(tipoIncidenciaValues, { error: 'tipo debe ser un valor válido de TipoIncidencia' })
    .optional(),
  estado: z
    .enum(estadoIncidenciaValues, { error: 'estado debe ser un valor válido de EstadoIncidencia' })
    .optional(),
});

export type ListarIncidenciasInput = z.infer<typeof listarIncidenciasSchema>;

export const actualizarEstadoIncidenciaSchema = z.object({
  estado: z.enum(estadoIncidenciaValues, {
    error: 'estado debe ser un valor válido de EstadoIncidencia',
  }),
});

export type ActualizarEstadoIncidenciaInput = z.infer<typeof actualizarEstadoIncidenciaSchema>;
