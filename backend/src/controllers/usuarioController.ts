import { Request, Response, NextFunction } from 'express';
import {
  listarUsuariosSchema,
  actualizarEstadoUsuarioSchema,
} from '../validators/usuarioValidator';
import { usuarioService } from '../services/usuarioService';

export const listarUsuarios = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarUsuariosSchema.parse(req.query);
    const resultado = await usuarioService.listar(query);
    res.status(200).json({
      data: resultado.data,
      meta: resultado.meta,
      message: 'Usuarios obtenidos exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuario = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const usuario = await usuarioService.obtenerPorId(id);
    res.status(200).json({
      data: usuario,
      message: 'Usuario obtenido',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoUsuario = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = actualizarEstadoUsuarioSchema.parse(req.body);
    const { id } = req.params;
    const operadorId = req.user!.id;
    const usuario = await usuarioService.actualizarEstado(id, dto, operadorId);
    res.status(200).json({
      data: usuario,
      message: 'Estado del usuario actualizado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
