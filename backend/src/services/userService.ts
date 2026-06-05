import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { authRepository } from '../repositories/authRepository';
import { sendPasswordResetEmail } from '../lib/mailer';
import { PerfilDto, UpdatePerfilInput } from '../types/userTypes';
import { Usuario } from '@prisma/client';

function toPerfilDto(usuario: Usuario): PerfilDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    telefono: usuario.telefono,
    rol: usuario.rol,
    createdAt: usuario.createdAt.toISOString(),
    updatedAt: usuario.updatedAt.toISOString(),
  };
}

function createServiceError(name: string, message: string, statusCode: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.name = name;
  (err as Error & { statusCode: number }).statusCode = statusCode;
  return err;
}

export const userService = {
  async getPerfil(userId: string): Promise<PerfilDto> {
    const usuario = await userRepository.findById(userId);
    if (!usuario) {
      throw createServiceError('NOT_FOUND', 'Usuario no encontrado', 404);
    }
    return toPerfilDto(usuario);
  },

  async updatePerfil(userId: string, dto: UpdatePerfilInput): Promise<PerfilDto> {
    const updated = await userRepository.updatePerfil(userId, dto);
    return toPerfilDto(updated);
  },

  async forgotPassword(correo: string): Promise<void> {
    const usuario = await authRepository.findByCorreo(correo);
    if (!usuario) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3_600_000);

    await userRepository.createPasswordResetToken({
      token,
      usuarioId: usuario.id,
      expiresAt,
    });

    await sendPasswordResetEmail(correo, token);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await userRepository.findPasswordResetToken(token);

    if (!resetToken || resetToken.usado || resetToken.expiresAt <= new Date()) {
      throw createServiceError(
        'INVALID_RESET_TOKEN',
        'Token inválido o expirado',
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await userRepository.updatePassword(resetToken.usuarioId, hashedPassword);
    await userRepository.markPasswordResetTokenUsado(resetToken.id);
  },
};
