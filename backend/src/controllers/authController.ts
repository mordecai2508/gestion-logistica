import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from '../validators/authValidator';
import { authService } from '../services/authService';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = loginSchema.parse(req.body);
    const { accessToken, user, refreshTokenValue } = await authService.login(dto);

    res.cookie('refreshToken', refreshTokenValue, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      data: { accessToken, user },
      message: 'Login exitoso',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tokenValue = req.cookies?.refreshToken as string | undefined;

    if (!tokenValue) {
      const err = new Error('Refresh token ausente') as Error & { statusCode: number };
      err.name = 'MISSING_REFRESH_TOKEN';
      err.statusCode = 401;
      throw err;
    }

    const { accessToken, newRefreshTokenValue } = await authService.refresh(tokenValue);

    res.cookie('refreshToken', newRefreshTokenValue, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      data: { accessToken },
      message: 'Token renovado',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);
    res.status(201).json({
      data: result,
      message: 'Usuario registrado exitosamente',
      status: 201,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tokenValue = req.cookies?.refreshToken as string | undefined;
    await authService.logout(tokenValue);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      data: null,
      message: 'Sesión cerrada correctamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
