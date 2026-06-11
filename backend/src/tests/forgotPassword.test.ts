import request from 'supertest';
import { app } from '../index';
import { userRepository } from '../repositories/userRepository';
import { authRepository } from '../repositories/authRepository';
import { Rol } from '@prisma/client';

jest.mock('../repositories/userRepository');
jest.mock('../repositories/authRepository');
jest.mock('../lib/mailer', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail } from '../lib/mailer';

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockedAuthRepo = authRepository as jest.Mocked<typeof authRepository>;
const mockedSendEmail = sendPasswordResetEmail as jest.Mock;

function makeUsuario(overrides: Partial<{
  id: string;
  nombre: string;
  correo: string;
}> = {}) {
  return {
    id: 'user-1',
    nombre: 'Test User',
    correo: 'test@example.com',
    password: 'hashed',
    telefono: null,
    rol: Rol.OPERADOR,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('R10 - debe devolver 200 aunque el correo no exista', async () => {
    mockedAuthRepo.findByCorreo.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ correo: 'noexiste@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('Si el correo existe recibirás un enlace de recuperación');
    expect(mockedUserRepo.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('R11+R12 - debe crear PasswordResetToken y llamar a sendPasswordResetEmail cuando el correo existe', async () => {
    const usuario = makeUsuario();
    mockedAuthRepo.findByCorreo.mockResolvedValue(usuario);
    mockedUserRepo.createPasswordResetToken.mockResolvedValue({
      id: 'prt-1',
      token: 'fake-token-hex',
      usuarioId: usuario.id,
      expiresAt: new Date(Date.now() + 3_600_000),
      usado: false,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ correo: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(mockedUserRepo.createPasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: usuario.id,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    expect(mockedSendEmail).toHaveBeenCalledWith(
      usuario.correo,
      expect.any(String),
    );
  });

  it('R14 - debe rechazar body sin correo', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({});

    expect(res.status).toBe(422);
  });

  it('R14 - debe rechazar correo con formato inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ correo: 'not-an-email' });

    expect(res.status).toBe(422);
  });
});
