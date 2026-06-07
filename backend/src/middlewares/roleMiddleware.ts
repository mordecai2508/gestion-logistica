import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';
import { AppError } from '../lib/appError';

export const roleMiddleware =
  (rol: Rol | Rol[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const roles = Array.isArray(rol) ? rol : [rol];
    if (req.user?.rol === undefined || !roles.includes(req.user.rol)) {
      return next(
        new AppError(
          'FORBIDDEN',
          `Acceso denegado: se requiere rol ${roles.join(' o ')}`,
          403,
        ),
      );
    }
    next();
  };
