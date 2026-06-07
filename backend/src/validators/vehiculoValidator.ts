import { z } from 'zod';

const ESTADOS_VEHICULO = ['DISPONIBLE', 'EN_RUTA', 'MANTENIMIENTO', 'FUERA_SERVICIO'] as const;

export const crearVehiculoSchema = z.object({
  placa: z
    .string()
    .trim()
    .min(1, 'La placa es requerida'),
  modelo: z
    .string()
    .trim()
    .min(1, 'El modelo es requerido'),
  capacidad: z
    .number({ message: 'La capacidad debe ser un número' })
    .positive('La capacidad debe ser un número positivo'),
});

export type CrearVehiculoInput = z.infer<typeof crearVehiculoSchema>;

export const listarVehiculosSchema = z.object({
  estado: z
    .enum(ESTADOS_VEHICULO, { message: 'El estado debe ser uno de: DISPONIBLE, EN_RUTA, MANTENIMIENTO, FUERA_SERVICIO' })
    .optional(),
});

export type ListarVehiculosInput = z.infer<typeof listarVehiculosSchema>;

export const actualizarEstadoVehiculoSchema = z.object({
  estado: z.enum(ESTADOS_VEHICULO, { message: 'El estado debe ser uno de: DISPONIBLE, EN_RUTA, MANTENIMIENTO, FUERA_SERVICIO' }),
});

export type ActualizarEstadoVehiculoInput = z.infer<typeof actualizarEstadoVehiculoSchema>;
