import { Request, Response, NextFunction } from 'express';
import { userSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/userValidator';
import { userService } from '../services/userService';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.getPerfil(req.user!.id);
    res.status(200).json({ data, message: 'Perfil obtenido', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = userSchema.parse(req.body);
    const data = await userService.updatePerfil(req.user!.id, dto);
    res.status(200).json({ data, message: 'Perfil actualizado', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = forgotPasswordSchema.parse(req.body);
    await userService.forgotPassword(dto.correo);
    res.status(200).json({
      data: null,
      message: 'Si el correo existe recibirás un enlace de recuperación',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = resetPasswordSchema.parse(req.body);
    await userService.resetPassword(dto.token, dto.newPassword);
    res.status(200).json({
      data: null,
      message: 'Contraseña actualizada correctamente',
      status: 200,
    });
  } catch (error) {
    next(error);
  }
};
