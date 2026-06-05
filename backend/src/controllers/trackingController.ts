import { Request, Response, NextFunction } from 'express';
import { trackingCodigoSchema } from '../validators/trackingValidator';
import { trackingService } from '../services/trackingService';

export const getTrackingByCodigo = async (
  req: Request<{ codigo: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { codigo } = trackingCodigoSchema.parse({ codigo: req.params.codigo });
    const result = await trackingService.getByCodigoSeguimiento(codigo);
    res.status(200).json({ data: result, message: 'Envío encontrado', status: 200 });
  } catch (error) {
    next(error);
  }
};
