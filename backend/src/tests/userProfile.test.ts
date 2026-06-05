import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { userRepository } from '../repositories/userRepository';
import { Rol } from '@prisma/client';

jest.mock('../repositories/userRepository');
jest.mock('../repositories/authRepository');

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;

const JWT_SECRET = 'test-secret';

function makeUsuario(overrides: Partial<{
  id: string;
  nombre: string;
  correo: string;
  password: string;
  telefono: string | null;
  rol: Rol;
}> = {}) {
  return {
    id: 'user-1',
    nombre: 'Test User',
    correo: 'test@example.com',
    password: 'hashed',
    telefono: '3001234567',
    rol: Rol.OPERADOR,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeToken(payload: { id: string; correo: string; rol: string } = {
  id: 'user-1',
  correo: 'test@example.com',
  rol: 'OPERADOR',
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/users/me
// ──────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/users/me', () => {
  it('R1 - debe devolver perfil del usuario autenticado', async () => {
    const usuario = makeUsuario();
    mockedUserRepo.findById.mockResolvedValue(usuario);

    const token = makeToken();
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Perfil obtenido');
    expect(res.body.data).toMatchObject({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol,
    });
    expect(res.body.data).toHaveProperty('createdAt');
    expect(res.body.data).toHaveProperty('updatedAt');
  });

  it('R2/R3 - debe rechazar GET /users/me sin token', async () => {
    const res = await request(app).get('/api/v1/users/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
  });

  it('R3 - debe rechazar GET /users/me con token inválido', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/users/me
// ──────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/users/me', () => {
  it('R4 - debe actualizar nombre y/o teléfono', async () => {
    const updatedUser = makeUsuario({ nombre: 'Nuevo Nombre' });
    mockedUserRepo.updatePerfil.mockResolvedValue(updatedUser);

    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nuevo Nombre' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Perfil actualizado');
    expect(res.body.data.nombre).toBe('Nuevo Nombre');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('R4 - verifica que correo y rol no cambian tras PATCH', async () => {
    const originalUser = makeUsuario();
    mockedUserRepo.updatePerfil.mockResolvedValue(originalUser);

    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nuevo Nombre' });

    expect(res.status).toBe(200);
    expect(res.body.data.correo).toBe(originalUser.correo);
    expect(res.body.data.rol).toBe(originalUser.rol);

    const callArgs = mockedUserRepo.updatePerfil.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('correo');
    expect(callArgs).not.toHaveProperty('rol');
    expect(callArgs).not.toHaveProperty('password');
  });

  it('R7 - debe rechazar PATCH /users/me sin campos', async () => {
    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('R5 - debe rechazar PATCH /users/me con nombre vacío', async () => {
    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '' });

    expect(res.status).toBe(422);
  });

  it('R6 - debe rechazar PATCH /users/me con telefono vacío', async () => {
    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefono: '' });

    expect(res.status).toBe(422);
  });

  it('R8 - debe ignorar o rechazar intento de actualizar correo', async () => {
    const token = makeToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ correo: 'otro@test.com' });

    // Zod schema rejects unknown field correo — returns 422 since no valid field present
    expect(res.status).toBe(422);
    expect(mockedUserRepo.updatePerfil).not.toHaveBeenCalled();
  });

  it('R9 - debe rechazar PATCH /users/me sin token', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ nombre: 'Test' });

    expect(res.status).toBe(401);
  });
});
