import { Request, Response, NextFunction } from 'express';
import {
  crearEnvioSchema,
  listarEnviosSchema,
  editarEnvioSchema,
  reprogramarEnvioSchema,
} from '../validators/envioValidator';
import { envioService } from '../services/envioService';

export const crearEnvioHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = crearEnvioSchema.parse(req.body);
    const envio = await envioService.crear(dto);
    res.status(201).json({
      data: envio,
      message: 'Envío creado exitosamente',
      status: 201,
    });
  } catch (error) {
    next(error);
  }
};

export const listarEnviosHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarEnviosSchema.parse(req.query);
    const result = await envioService.listar(query);
    res.status(200).json({
      ...result,
      message: 'Envíos obtenidos exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerDetalleHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const envio = await envioService.obtenerDetalle(id);
    res.status(200).json({
      data: envio,
      message: 'Envío obtenido exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const editarEnvioHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = editarEnvioSchema.parse(req.body);
    const envio = await envioService.editar(id, dto);
    res.status(200).json({
      data: envio,
      message: 'Envío actualizado exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelarEnvioHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await envioService.cancelar(id);
    res.status(200).json({
      data: result,
      message: 'Envío cancelado exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const reprogramarEnvio = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = reprogramarEnvioSchema.parse(req.body);
    const result = await envioService.reprogramar(id, dto);
    res.status(200).json({
      data: result,
      message: 'Entrega reprogramada',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
