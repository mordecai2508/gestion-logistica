import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Rol } from '@prisma/client';

interface JwtPayload {
  id: string;
  correo: string;
  rol: Rol;
}

function makeError(name: string, message: string, statusCode: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.name = name;
  (err as Error & { statusCode: number }).statusCode = statusCode;
  return err;
}

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(makeError('MISSING_TOKEN', 'Token de acceso requerido', 401));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next(makeError('INVALID_TOKEN', 'Token inválido', 401));
  }

  const token = parts[1];
  const jwtSecret = process.env.JWT_SECRET ?? '';

  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = { id: payload.id, correo: payload.correo, rol: payload.rol };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      next(makeError('EXPIRED_TOKEN', 'Token expirado', 401));
    } else if (err instanceof JsonWebTokenError) {
      next(makeError('INVALID_TOKEN', 'Token inválido', 401));
    } else {
      next(err);
    }
  }
};
