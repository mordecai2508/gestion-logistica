import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: err.issues.map((issue) => issue.message).join(', '),
      statusCode: 422,
      details: err.issues,
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(422).json({
        error: 'FILE_TOO_LARGE',
        message: 'El archivo excede el tamaño máximo permitido (5MB)',
        statusCode: 422,
      });
      return;
    }
    res.status(422).json({
      error: 'INVALID_FILE_UPLOAD',
      message: err.message,
      statusCode: 422,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    statusCode,
  });
};
