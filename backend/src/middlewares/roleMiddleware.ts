import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';
import { AppError } from '../lib/appError';

export const roleMiddleware =
  (rol: Rol) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user?.rol !== rol) {
      return next(
        new AppError(
          'FORBIDDEN',
          `Acceso denegado: se requiere rol ${rol}`,
          403,
        ),
      );
    }
    next();
  };
