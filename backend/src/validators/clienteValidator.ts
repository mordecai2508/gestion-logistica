import { z } from 'zod';
import { EstadoEnvio } from '@prisma/client';

const estadoEnvioValues = Object.values(EstadoEnvio) as [EstadoEnvio, ...EstadoEnvio[]];

export const listarMisEnviosSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive('page debe ser un entero positivo')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive('limit debe ser un entero positivo')),
  estado: z
    .enum(estadoEnvioValues, { error: 'estado debe ser un valor válido de EstadoEnvio' })
    .optional(),
});

export type ListarMisEnviosInput = z.infer<typeof listarMisEnviosSchema>;
