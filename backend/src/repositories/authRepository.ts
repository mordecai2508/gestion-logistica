import { PrismaClient, Usuario, RefreshToken, Rol } from '@prisma/client';
import { RegisterDto } from '../validators/authValidator';

const prisma = new PrismaClient();

export const authRepository = {
  async findByCorreo(correo: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({ where: { correo } });
  },

  async createUsuario(
    data: RegisterDto & { hashedPassword: string },
  ): Promise<{ id: string; correo: string; rol: Rol }> {
    return prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: data.nombre,
          correo: data.correo,
          password: data.hashedPassword,
          telefono: data.telefono,
          rol: data.rol as Rol,
        },
      });

      if (data.rol === 'CLIENTE') {
        await tx.cliente.create({ data: { usuarioId: usuario.id } });
      } else if (data.rol === 'OPERADOR') {
        await tx.operador.create({ data: { usuarioId: usuario.id } });
      } else if (data.rol === 'REPARTIDOR') {
        await tx.repartidor.create({ data: { usuarioId: usuario.id, disponible: true } });
      }

      return { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
    });
  },

  async createRefreshToken(data: {
    token: string;
    usuarioId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  async findRefreshToken(
    token: string,
  ): Promise<(RefreshToken & { usuario: Usuario }) | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { usuario: true },
    });
  },

  async revokeRefreshToken(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revocado: true },
    });
  },

  async revokeAllUserRefreshTokens(usuarioId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { usuarioId, revocado: false },
      data: { revocado: true },
    });
  },
};
