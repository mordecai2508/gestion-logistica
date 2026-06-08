import { z } from 'zod';

export const listarEntregasSchema = z.object({
  repartidorId: z.literal('me', {
    message: 'Solo se admite repartidorId=me',
  }),
});

export type ListarEntregasInput = z.infer<typeof listarEntregasSchema>;

export const registrarFalloSchema = z.object({
  nota: z.string().min(1, 'La nota es requerida'),
});

export type RegistrarFalloBodyInput = z.infer<typeof registrarFalloSchema>;
