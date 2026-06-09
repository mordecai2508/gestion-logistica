import { Request, Response, NextFunction } from 'express';
import {
  listarRepartidoresSchema,
  actualizarRepartidorSchema,
} from '../validators/repartidorValidator';
import { repartidorService } from '../services/repartidorService';

export const listarRepartidores = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarRepartidoresSchema.parse(req.query);
    const resultado = await repartidorService.listar(query);
    res.status(200).json({
      data: resultado.data,
      meta: resultado.meta,
      message: 'Repartidores obtenidos exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerRepartidor = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const repartidor = await repartidorService.obtenerPorId(id);
    res.status(200).json({
      data: repartidor,
      message: 'Repartidor obtenido',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarRepartidor = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = actualizarRepartidorSchema.parse(req.body);
    const { id } = req.params;
    const repartidor = await repartidorService.actualizar(id, dto);
    res.status(200).json({
      data: repartidor,
      message: 'Repartidor actualizado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
