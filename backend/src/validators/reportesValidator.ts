import { z } from 'zod';

export const reporteEnviosFiltroSchema = z
  .object({
    desde: z.string({ error: 'desde es requerido' }).min(1, 'desde es requerido'),
    hasta: z.string({ error: 'hasta es requerido' }).min(1, 'hasta es requerido'),
  })
  .refine((data) => new Date(data.desde) <= new Date(data.hasta), {
    message: 'desde debe ser anterior o igual a hasta',
  });

export type ReporteEnviosFiltroInput = z.infer<typeof reporteEnviosFiltroSchema>;
