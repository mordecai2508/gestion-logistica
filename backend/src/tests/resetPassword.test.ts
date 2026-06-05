import request from 'supertest';
import { app } from '../index';
import { userRepository } from '../repositories/userRepository';

jest.mock('../repositories/userRepository');
jest.mock('../repositories/authRepository');

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;

function makeResetToken(overrides: Partial<{
  id: string;
  token: string;
  usuarioId: string;
  expiresAt: Date;
  usado: boolean;
}> = {}) {
  return {
    id: 'prt-1',
    token: 'valid-hex-token',
    usuarioId: 'user-1',
    expiresAt: new Date(Date.now() + 3_600_000),
    usado: false,
    createdAt: new Date(),
    ...overrides,
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/auth/reset-password', () => {
  it('R15 - debe actualizar password y marcar token como usado con token válido', async () => {
    const resetToken = makeResetToken();
    mockedUserRepo.findPasswordResetToken.mockResolvedValue(resetToken);
    mockedUserRepo.updatePassword.mockResolvedValue(undefined);
    mockedUserRepo.markPasswordResetTokenUsado.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'valid-hex-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('Contraseña actualizada correctamente');
    expect(mockedUserRepo.updatePassword).toHaveBeenCalledWith(
      resetToken.usuarioId,
      expect.any(String),
    );
    expect(mockedUserRepo.markPasswordResetTokenUsado).toHaveBeenCalledWith(resetToken.id);
  });

  it('R17 - debe devolver 400 con token expirado', async () => {
    const expiredToken = makeResetToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    mockedUserRepo.findPasswordResetToken.mockResolvedValue(expiredToken);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'expired-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RESET_TOKEN');
    expect(res.body.message).toBe('Token inválido o expirado');
  });

  it('R18 - debe devolver 400 con token ya usado', async () => {
    const usedToken = makeResetToken({ usado: true });
    mockedUserRepo.findPasswordResetToken.mockResolvedValue(usedToken);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'used-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RESET_TOKEN');
  });

  it('R16 - debe devolver 400 con token inexistente', async () => {
    mockedUserRepo.findPasswordResetToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'nonexistent-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RESET_TOKEN');
  });

  it('R19 - debe rechazar body inválido (newPassword < 8 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'some-token', newPassword: 'short' });

    expect(res.status).toBe(422);
  });

  it('R19 - debe rechazar body sin token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ newPassword: 'newpassword123' });

    expect(res.status).toBe(422);
  });

  it('R20 - no debe aceptar el mismo token dos veces', async () => {
    const usedToken = makeResetToken({ usado: true });
    mockedUserRepo.findPasswordResetToken.mockResolvedValue(usedToken);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'already-used-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RESET_TOKEN');
  });
});
