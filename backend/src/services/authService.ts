import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authRepository } from '../repositories/authRepository';
import { LoginDto, RegisterDto } from '../validators/authValidator';
import { Rol } from '@prisma/client';

interface AuthUserPayload {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

interface LoginResult {
  accessToken: string;
  user: AuthUserPayload;
  refreshTokenValue: string;
}

interface RefreshResult {
  accessToken: string;
  newRefreshTokenValue: string;
}

function createAuthError(code: string, message: string, status: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.name = code;
  (err as Error & { statusCode: number }).statusCode = status;
  return err;
}

export const authService = {
  async login(dto: LoginDto): Promise<LoginResult> {
    const usuario = await authRepository.findByCorreo(dto.correo);
    if (!usuario) {
      throw createAuthError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401);
    }

    const passwordMatch = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordMatch) {
      throw createAuthError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const accessToken = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      jwtSecret,
      { expiresIn: '15m' },
    );

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.createRefreshToken({
      token: refreshTokenValue,
      usuarioId: usuario.id,
      expiresAt,
    });

    return {
      accessToken,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
      refreshTokenValue,
    };
  },

  async refresh(tokenValue: string): Promise<RefreshResult> {
    const stored = await authRepository.findRefreshToken(tokenValue);

    if (!stored || stored.revocado) {
      throw createAuthError('INVALID_REFRESH_TOKEN', 'Token inválido', 401);
    }

    if (stored.expiresAt < new Date()) {
      throw createAuthError(
        'EXPIRED_REFRESH_TOKEN',
        'Sesión expirada, inicia sesión de nuevo',
        401,
      );
    }

    await authRepository.revokeRefreshToken(stored.id);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const { usuario } = stored;
    const accessToken = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      jwtSecret,
      { expiresIn: '15m' },
    );

    const newRefreshTokenValue = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.createRefreshToken({
      token: newRefreshTokenValue,
      usuarioId: usuario.id,
      expiresAt,
    });

    return { accessToken, newRefreshTokenValue };
  },

  async logout(tokenValue: string | undefined): Promise<void> {
    if (!tokenValue) return;

    const stored = await authRepository.findRefreshToken(tokenValue);
    if (stored && !stored.revocado) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  },

  async register(dto: RegisterDto): Promise<{ id: string; correo: string; rol: Rol }> {
    const existing = await authRepository.findByCorreo(dto.correo);
    if (existing) {
      const err = new Error('El correo ya está registrado') as Error & {
        statusCode: number;
        error: string;
      };
      err.name = 'EMAIL_ALREADY_EXISTS';
      (err as Error & { statusCode: number }).statusCode = 409;
      (err as Error & { error: string }).error = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return authRepository.createUsuario({ ...dto, hashedPassword });
  },
};
