import { Request, Response, NextFunction } from 'express';
import { crearRutaSchema, reasignarRutaSchema, listarRutasSchema } from '../validators/rutaValidator';
import { rutaService } from '../services/rutaService';

export const crearRuta = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = crearRutaSchema.parse(req.body);
    const ruta = await rutaService.crear(dto);
    res.status(201).json({
      data: ruta,
      message: 'Ruta creada exitosamente',
      status: 201,
    });
  } catch (error) {
    next(error);
  }
};

export const listarRutas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarRutasSchema.parse(req.query);
    const result = await rutaService.listar(
      query,
      req.user!.id,
      req.user!.rol,
    );
    res.status(200).json({
      ...result,
      message: 'Rutas obtenidas exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerRuta = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const ruta = await rutaService.obtenerDetalle(id, req.user!.id, req.user!.rol);
    res.status(200).json({
      data: ruta,
      message: 'Ruta obtenida exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const reasignarRuta = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = reasignarRutaSchema.parse(req.body);
    const ruta = await rutaService.reasignar(id, dto);
    res.status(200).json({
      data: ruta,
      message: 'Ruta reasignada exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerRutaOptima = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const resultado = await rutaService.calcularOptima(id);
    res.status(200).json({
      data: resultado,
      message: 'Ruta óptima calculada exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
