import { Request, Response, NextFunction } from 'express';
import { notificacionService } from '../services/notificacionService';
import { listarNotificacionesSchema } from '../validators/notificacionValidator';

export const listarNotificaciones = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarNotificacionesSchema.parse(req.query);
    const result = await notificacionService.listar(req.user!.id, query);
    res.status(200).json({
      data: result.data,
      meta: result.meta,
      message: 'Notificaciones obtenidas',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const marcarNotificacionComoLeida = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = await notificacionService.marcarComoLeida(id, req.user!.id);
    res.status(200).json({
      data,
      message: 'Notificación marcada como leída',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
