import { Request, Response, NextFunction } from 'express';
import {
  crearIncidenciaSchema,
  listarIncidenciasSchema,
  actualizarEstadoIncidenciaSchema,
} from '../validators/incidenciaValidator';
import { incidenciaService } from '../services/incidenciaService';

export const crearIncidencia = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = crearIncidenciaSchema.parse(req.body);
    const incidencia = await incidenciaService.crear(dto);
    res.status(201).json({
      data: incidencia,
      message: 'Incidencia registrada',
      status: 201,
    });
  } catch (error) {
    next(error);
  }
};

export const listarIncidencias = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarIncidenciasSchema.parse(req.query);
    const result = await incidenciaService.listar(query);
    res.status(200).json({
      ...result,
      message: 'Incidencias obtenidas',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoIncidencia = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = actualizarEstadoIncidenciaSchema.parse(req.body);
    const incidencia = await incidenciaService.actualizarEstado(id, dto.estado);
    res.status(200).json({
      data: incidencia,
      message: 'Estado de incidencia actualizado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
