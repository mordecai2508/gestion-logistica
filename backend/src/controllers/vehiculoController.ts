import { Request, Response, NextFunction } from 'express';
import {
  crearVehiculoSchema,
  listarVehiculosSchema,
  actualizarEstadoVehiculoSchema,
} from '../validators/vehiculoValidator';
import { vehiculoService } from '../services/vehiculoService';

export const crearVehiculo = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = crearVehiculoSchema.parse(req.body);
    const vehiculo = await vehiculoService.crear(dto);
    res.status(201).json({
      data: vehiculo,
      message: 'Vehículo registrado',
      status: 201,
    });
  } catch (error) {
    next(error);
  }
};

export const listarVehiculos = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listarVehiculosSchema.parse(req.query);
    const vehiculos = await vehiculoService.listar(query);
    res.status(200).json({
      data: vehiculos,
      message: 'Vehículos obtenidos exitosamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoVehiculo = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = actualizarEstadoVehiculoSchema.parse(req.body);
    const vehiculo = await vehiculoService.actualizarEstado(id, estado);
    res.status(200).json({
      data: vehiculo,
      message: 'Estado actualizado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
