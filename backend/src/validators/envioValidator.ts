import { z } from 'zod';
import { EstadoEnvio } from '@prisma/client';

export const crearEnvioSchema = z.object({
  remitente: z.string().min(1, 'El remitente es requerido'),
  destinatario: z.string().min(1, 'El destinatario es requerido'),
  direccionDestino: z.string().min(1, 'La dirección de destino es requerida'),
  peso: z.number().gt(0, 'El peso debe ser mayor a 0'),
  dimensiones: z
    .string()
    .regex(
      /^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/i,
      'Las dimensiones deben tener formato WxHxD (ej. 30x20x15)',
    ),
  clienteId: z.string().cuid('El clienteId debe ser un cuid válido'),
  descripcion: z.string().optional(),
});

export type CrearEnvioInput = z.infer<typeof crearEnvioSchema>;

const estadoEnvioValues = Object.values(EstadoEnvio) as [EstadoEnvio, ...EstadoEnvio[]];

export const listarEnviosSchema = z.object({
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
  estado: z
    .enum(estadoEnvioValues, { error: 'estado debe ser un valor válido de EstadoEnvio' })
    .optional(),
  cliente: z.string().optional(),
  codigo: z.string().optional(),
});

export type ListarEnviosInput = z.infer<typeof listarEnviosSchema>;

export const editarEnvioSchema = z
  .object({
    remitente: z.string().min(1, 'El remitente no puede estar vacío').optional(),
    destinatario: z.string().min(1, 'El destinatario no puede estar vacío').optional(),
    direccionDestino: z.string().min(1, 'La dirección de destino no puede estar vacía').optional(),
    peso: z.number().gt(0, 'El peso debe ser mayor a 0').optional(),
    dimensiones: z
      .string()
      .regex(
        /^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/i,
        'Las dimensiones deben tener formato WxHxD (ej. 30x20x15)',
      )
      .optional(),
    descripcion: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.remitente !== undefined ||
      data.destinatario !== undefined ||
      data.direccionDestino !== undefined ||
      data.peso !== undefined ||
      data.dimensiones !== undefined ||
      data.descripcion !== undefined,
    { message: 'Se requiere al menos un campo editable' },
  );

export type EditarEnvioInput = z.infer<typeof editarEnvioSchema>;
