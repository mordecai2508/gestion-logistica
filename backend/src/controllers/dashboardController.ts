import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';

export const getMetricsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getMetrics();
    res.status(200).json({ data, message: 'Métricas obtenidas', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const getEnviosRecientesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getEnviosRecientes();
    res.status(200).json({ data, message: 'Envíos recientes obtenidos', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const getRutasPendientesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getRutasPendientes();
    res.status(200).json({ data, message: 'Rutas pendientes obtenidas', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const getVehiculosDisponiblesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getVehiculosDisponibles();
    res.status(200).json({ data, message: 'Vehículos disponibles obtenidos', status: 200 });
  } catch (error) {
    next(error);
  }
};
