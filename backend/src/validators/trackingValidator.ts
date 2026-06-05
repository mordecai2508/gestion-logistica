import { z } from 'zod';

export const trackingCodigoSchema = z.object({
  codigo: z
    .string()
    .regex(
      /^TRK-\d{8}-[A-Z0-9]{8}$/,
      'Código de seguimiento inválido',
    ),
});

export type TrackingCodigoInput = z.infer<typeof trackingCodigoSchema>;

export const locationUpdateSchema = z.object({
  envioId: z.string().cuid('envioId debe ser un cuid válido'),
  lat: z.number(),
  lng: z.number(),
});

export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
