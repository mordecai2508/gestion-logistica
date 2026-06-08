import { Request, Response, NextFunction } from 'express';
import { entregaService } from '../services/entregaService';
import {
  listarEntregasSchema,
  registrarFalloSchema,
} from '../validators/entregaValidator';
import { AppError } from '../lib/appError';

export const listarMisEntregas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    listarEntregasSchema.parse(req.query);
    const data = await entregaService.listarMisEntregas(req.user!.id);
    res.status(200).json({
      data,
      message: 'Entregas obtenidas',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmarEntrega = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const foto = files?.foto?.[0];
    const firma = files?.firma?.[0];

    if (foto === undefined || firma === undefined) {
      throw new AppError(
        'MISSING_FILE',
        'Se requieren los archivos foto y firma',
        422,
      );
    }

    const data = await entregaService.confirmarEntrega(
      req.params.id,
      req.user!.id,
      { foto, firma },
    );
    res.status(200).json({
      data,
      message: 'Entrega confirmada',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const registrarFallo = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = registrarFalloSchema.parse(req.body);
    const data = await entregaService.registrarFallo(req.params.id, req.user!.id, {
      nota: dto.nota,
      foto: req.file,
    });
    res.status(200).json({
      data,
      message: 'Fallo de entrega registrado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
