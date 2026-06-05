import { PrismaClient, Usuario, PasswordResetToken } from '@prisma/client';
import { UpdatePerfilInput, CreatePasswordResetTokenInput } from '../types/userTypes';

const prisma = new PrismaClient();

export const userRepository = {
  async findById(id: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({ where: { id } });
  },

  async updatePerfil(id: string, data: UpdatePerfilInput): Promise<Usuario> {
    const updateData: UpdatePerfilInput = {};
    if (data.nombre !== undefined) {
      updateData.nombre = data.nombre;
    }
    if (data.telefono !== undefined) {
      updateData.telefono = data.telefono;
    }
    return prisma.usuario.update({ where: { id }, data: updateData });
  },

  async createPasswordResetToken(
    data: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data: {
        token: data.token,
        usuarioId: data.usuarioId,
        expiresAt: data.expiresAt,
        usado: false,
      },
    });
  },

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findUnique({ where: { token } });
  },

  async markPasswordResetTokenUsado(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usado: true },
    });
  },

  async updatePassword(usuarioId: string, hashedPassword: string): Promise<void> {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { password: hashedPassword },
    });
  },
};
