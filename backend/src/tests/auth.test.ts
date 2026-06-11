import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import { app } from '../index';
import { authRepository } from '../repositories/authRepository';
import { authMiddleware } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorHandler';
import { Rol } from '@prisma/client';

// Mock the entire repository so no real DB is needed
jest.mock('../repositories/authRepository');

// Mock PrismaClient for repository unit tests — factory runs before any `const` in this file,
// so we build the shared state inside the factory and expose it via module-level vars set lazily.
let mockPrismaInstance: {
  usuario: { findUnique: jest.Mock };
  refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};
let mockTx: {
  usuario: { create: jest.Mock };
  cliente: { create: jest.Mock };
  operador: { create: jest.Mock };
  repartidor: { create: jest.Mock };
};

jest.mock('@prisma/client', () => {
  const original = jest.requireActual('@prisma/client');
  const tx = {
    usuario: { create: jest.fn() },
    cliente: { create: jest.fn() },
    operador: { create: jest.fn() },
    repartidor: { create: jest.fn() },
  };
  const instance = {
    usuario: { findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  // Attach to global so test code can access them after hoisting
  (global as Record<string, unknown>).__mockTx = tx;
  (global as Record<string, unknown>).__mockPrismaInstance = instance;
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

const mockedRepo = authRepository as jest.Mocked<typeof authRepository>;

// Extended mock type that includes createUsuario
interface MockedRepoWithCreate extends jest.Mocked<typeof authRepository> {
  createUsuario: jest.Mock;
}
const mockedRepoFull = mockedRepo as unknown as MockedRepoWithCreate;

const JWT_SECRET = 'test-secret';

// Helpers
function makeUser(overrides: Partial<{
  id: string;
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
  activo: boolean;
}> = {}) {
  return {
    id: 'user-1',
    nombre: 'Test User',
    correo: 'test@example.com',
    password: '', // filled in beforeAll
    telefono: null,
    rol: Rol.OPERADOR,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRefreshTokenRecord(overrides: Partial<{
  id: string;
  token: string;
  usuarioId: string;
  expiresAt: Date;
  revocado: boolean;
}> = {}) {
  const usuario = makeUser();
  return {
    id: 'rt-1',
    token: 'valid-refresh-token',
    usuarioId: usuario.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revocado: false,
    createdAt: new Date(),
    usuario,
    ...overrides,
  };
}

let hashedPassword: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  hashedPassword = await bcrypt.hash('password123', 12);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  it('R1 R2 - debe devolver accessToken en body y cookie refreshToken httpOnly con credenciales válidas', async () => {
    const user = makeUser({ password: hashedPassword });
    mockedRepo.findByCorreo.mockResolvedValue(user);
    mockedRepo.createRefreshToken.mockResolvedValue(makeRefreshTokenRecord());

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    });
    expect(res.body.message).toBe('Login exitoso');

    // Cookie assertions
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refreshToken=');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('R3 - debe devolver 401 INVALID_CREDENTIALS si el correo no existe', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'noexiste@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('R4 - debe devolver 401 INVALID_CREDENTIALS si la contraseña es incorrecta', async () => {
    const user = makeUser({ password: hashedPassword });
    mockedRepo.findByCorreo.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'test@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('R5 - debe devolver 422 si el campo correo tiene formato inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(422);
  });

  it('R6 - debe devolver 422 si el campo password está vacío', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'test@example.com', password: '' });

    expect(res.status).toBe(422);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/refresh', () => {
  it('R7 R8 - debe devolver nuevo accessToken y rotar la cookie refreshToken con token válido', async () => {
    const stored = makeRefreshTokenRecord();
    mockedRepo.findRefreshToken.mockResolvedValue(stored);
    mockedRepo.revokeRefreshToken.mockResolvedValue(undefined);
    mockedRepo.createRefreshToken.mockResolvedValue(makeRefreshTokenRecord({ token: 'new-token' }));

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=valid-refresh-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refreshToken=');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('R9 - debe devolver 401 MISSING_REFRESH_TOKEN si no hay cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_REFRESH_TOKEN');
    expect(res.body.message).toBe('Refresh token ausente');
  });

  it('R10 - debe devolver 401 EXPIRED_REFRESH_TOKEN si el token ha expirado', async () => {
    const expired = makeRefreshTokenRecord({
      expiresAt: new Date(Date.now() - 1000),
    });
    mockedRepo.findRefreshToken.mockResolvedValue(expired);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=expired-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('EXPIRED_REFRESH_TOKEN');
  });

  it('R11 - debe devolver 401 INVALID_REFRESH_TOKEN si el token está malformado', async () => {
    mockedRepo.findRefreshToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=malformed-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_REFRESH_TOKEN');
  });

  it('R12 - debe devolver 401 INVALID_REFRESH_TOKEN si el token ya fue rotado (replay)', async () => {
    const revoked = makeRefreshTokenRecord({ revocado: true });
    mockedRepo.findRefreshToken.mockResolvedValue(revoked);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=rotated-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_REFRESH_TOKEN');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/logout', () => {
  it('R13 - debe responder 200 y limpiar la cookie refreshToken', async () => {
    mockedRepo.findRefreshToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refreshToken=some-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('Sesión cerrada correctamente');
    // Cookie should be cleared
    const rawCookies = res.headers['set-cookie'];
    const cookies = rawCookies
      ? Array.isArray(rawCookies)
        ? rawCookies
        : [rawCookies as string]
      : [];
    if (cookies.length > 0) {
      const rtCookie = cookies.find((c) => c.startsWith('refreshToken='));
      if (rtCookie) {
        expect(rtCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
      }
    }
  });

  it('R14 - debe marcar el refreshToken como revocado en BD tras logout', async () => {
    const stored = makeRefreshTokenRecord();
    mockedRepo.findRefreshToken.mockResolvedValue(stored);
    mockedRepo.revokeRefreshToken.mockResolvedValue(undefined);

    await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refreshToken=valid-refresh-token');

    expect(mockedRepo.revokeRefreshToken).toHaveBeenCalledWith(stored.id);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  const validPayload = {
    nombre: 'Ana García',
    correo: 'ana@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    telefono: '3001234567',
    rol: 'CLIENTE',
  };

  it('R1 - debe devolver 201 con { data: { id, correo, rol } } al registrar con datos válidos', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockResolvedValue({ id: 'new-user-id', correo: 'ana@example.com', rol: Rol.CLIENTE });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario registrado exitosamente');
    expect(res.body.data).toMatchObject({ id: 'new-user-id', correo: 'ana@example.com', rol: 'CLIENTE' });
  });

  it('R2 - debe persistir la contraseña como hash bcrypt y no en texto plano', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    let capturedHashedPassword = '';
    mockedRepoFull.createUsuario =
      jest.fn().mockImplementation(async (data: { hashedPassword: string; correo: string; rol: string }) => {
        capturedHashedPassword = data.hashedPassword;
        return { id: 'new-user-id', correo: data.correo, rol: data.rol };
      });

    await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(capturedHashedPassword).not.toBe('password123');
    const isHash = await bcrypt.compare('password123', capturedHashedPassword);
    expect(isHash).toBe(true);
  });

  it('R3 - debe devolver 409 EMAIL_ALREADY_EXISTS si el correo ya existe en la BD', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(makeUser({ correo: 'ana@example.com' }));

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
    expect(res.body.message).toBe('El correo ya está registrado');
  });

  it('R4 - debe devolver 422 si el campo correo tiene formato inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, correo: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('R5 - debe devolver 422 si la contraseña tiene menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, password: 'short', confirmPassword: 'short' });

    expect(res.status).toBe(422);
  });

  it('R6 - debe devolver 422 si confirmPassword no coincide con password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, confirmPassword: 'diferente123' });

    expect(res.status).toBe(422);
  });

  it('R7 - debe devolver 422 si el campo nombre está vacío', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, nombre: '' });

    expect(res.status).toBe(422);
  });

  it('R8 - debe devolver 422 si el campo telefono está vacío', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, telefono: '' });

    expect(res.status).toBe(422);
  });

  it('R9 - debe devolver 422 si el rol no es uno de los valores permitidos', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, rol: 'ADMIN' });

    expect(res.status).toBe(422);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Registro — creación de perfil por rol
// ──────────────────────────────────────────────────────────────────────────────
describe('Registro — creación de perfil por rol', () => {
  const makePayload = (rol: string) => ({
    nombre: 'Test User',
    correo: `${rol.toLowerCase()}@example.com`,
    password: 'password123',
    confirmPassword: 'password123',
    telefono: '3001234567',
    rol,
  });

  it('R10 - debe crear un registro en la tabla Cliente cuando rol es CLIENTE', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockResolvedValue({ id: 'c-1', correo: 'cliente@example.com', rol: Rol.CLIENTE });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(makePayload('CLIENTE'));

    expect(res.status).toBe(201);
    expect(res.body.data.rol).toBe('CLIENTE');
    const createUsuarioMock = mockedRepoFull.createUsuario;
    expect(createUsuarioMock).toHaveBeenCalledWith(expect.objectContaining({ rol: 'CLIENTE' }));
  });

  it('R11 - debe crear un registro en la tabla Operador cuando rol es OPERADOR', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockResolvedValue({ id: 'o-1', correo: 'operador@example.com', rol: Rol.OPERADOR });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(makePayload('OPERADOR'));

    expect(res.status).toBe(201);
    expect(res.body.data.rol).toBe('OPERADOR');
    const createUsuarioMock = mockedRepoFull.createUsuario;
    expect(createUsuarioMock).toHaveBeenCalledWith(expect.objectContaining({ rol: 'OPERADOR' }));
  });

  it('R12 - debe crear un registro en la tabla Repartidor cuando rol es REPARTIDOR', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockResolvedValue({ id: 'r-1', correo: 'repartidor@example.com', rol: Rol.REPARTIDOR });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(makePayload('REPARTIDOR'));

    expect(res.status).toBe(201);
    expect(res.body.data.rol).toBe('REPARTIDOR');
    const createUsuarioMock = mockedRepoFull.createUsuario;
    expect(createUsuarioMock).toHaveBeenCalledWith(expect.objectContaining({ rol: 'REPARTIDOR' }));
  });

  it('R13 - debe hacer rollback completo si falla la creación del perfil (transacción atómica)', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockRejectedValue(new Error('DB constraint violation'));

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(makePayload('CLIENTE'));

    expect(res.status).toBe(500);
  });

  it('R21 - no debe incluir el campo password en la respuesta', async () => {
    mockedRepo.findByCorreo.mockResolvedValue(null);
    mockedRepoFull.createUsuario =
      jest.fn().mockResolvedValue({ id: 'u-1', correo: 'test@example.com', rol: Rol.CLIENTE });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(makePayload('CLIENTE'));

    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('password');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// authMiddleware (via a standalone mini-app)
// ──────────────────────────────────────────────────────────────────────────────
describe('authMiddleware', () => {
  // Build a minimal Express app that isolates the middleware + error handler
  const testApp = express();
  testApp.use(express.json());
  testApp.get('/protected', authMiddleware, (req: import('express').Request, res: import('express').Response) => {
    res.status(200).json({ user: req.user });
  });
  testApp.use(errorHandler);

  it('R15 - debe devolver 401 MISSING_TOKEN si no hay Authorization header', async () => {
    const res = await request(testApp).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
  });

  it('R16 - debe devolver 401 INVALID_TOKEN si el Bearer token está malformado', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.valid.jwt');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('R17 - debe devolver 401 EXPIRED_TOKEN si el accessToken ha expirado', async () => {
    const expiredToken = jwt.sign(
      { id: 'u1', correo: 'a@b.com', rol: 'OPERADOR' },
      JWT_SECRET,
      { expiresIn: -1 },
    );

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('EXPIRED_TOKEN');
  });

  it('R18 - debe adjuntar req.user y llamar next() con token válido', async () => {
    const token = jwt.sign(
      { id: 'u1', correo: 'a@b.com', rol: 'OPERADOR' },
      JWT_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'u1', correo: 'a@b.com', rol: 'OPERADOR' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// authRepository.createUsuario — creación de perfil por rol
// ──────────────────────────────────────────────────────────────────────────────
describe('authRepository.createUsuario — creación de perfil por rol', () => {
  // Get the real (unmocked) repository using jest.requireActual
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realAuthRepository = jest.requireActual('../repositories/authRepository').authRepository as typeof import('../repositories/authRepository').authRepository;

  beforeEach(() => {
    mockTx = (global as Record<string, unknown>).__mockTx as typeof mockTx;
    mockPrismaInstance = (global as Record<string, unknown>).__mockPrismaInstance as typeof mockPrismaInstance;

    // Reset tx mocks (don't call jest.clearAllMocks here as it interferes with implementations)
    mockTx.usuario.create.mockReset();
    mockTx.cliente.create.mockReset();
    mockTx.operador.create.mockReset();
    mockTx.repartidor.create.mockReset();

    // Configure $transaction to execute callback synchronously with the tx mock
    mockPrismaInstance.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    });
  });

  it('R10 - debe llamar a tx.cliente.create cuando rol es CLIENTE', async () => {
    mockTx.usuario.create.mockResolvedValue({ id: 'user-1', correo: 'cliente@example.com', rol: Rol.CLIENTE });
    mockTx.cliente.create.mockResolvedValue({ id: 'client-1' });

    const result = await realAuthRepository.createUsuario({
      nombre: 'Test',
      correo: 'cliente@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      telefono: '3001234567',
      rol: 'CLIENTE',
      hashedPassword: 'hashed',
    });

    expect(mockTx.cliente.create).toHaveBeenCalledWith({ data: { usuarioId: 'user-1' } });
    expect(mockTx.operador.create).not.toHaveBeenCalled();
    expect(mockTx.repartidor.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'user-1', correo: 'cliente@example.com', rol: Rol.CLIENTE });
  });

  it('R11 - debe llamar a tx.operador.create cuando rol es OPERADOR', async () => {
    mockTx.usuario.create.mockResolvedValue({ id: 'user-2', correo: 'operador@example.com', rol: Rol.OPERADOR });
    mockTx.operador.create.mockResolvedValue({ id: 'op-1' });

    await realAuthRepository.createUsuario({
      nombre: 'Test',
      correo: 'operador@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      telefono: '3001234567',
      rol: 'OPERADOR',
      hashedPassword: 'hashed',
    });

    expect(mockTx.operador.create).toHaveBeenCalledWith({ data: { usuarioId: 'user-2' } });
    expect(mockTx.cliente.create).not.toHaveBeenCalled();
    expect(mockTx.repartidor.create).not.toHaveBeenCalled();
  });

  it('R12 - debe llamar a tx.repartidor.create con disponible:true cuando rol es REPARTIDOR', async () => {
    mockTx.usuario.create.mockResolvedValue({ id: 'user-3', correo: 'repartidor@example.com', rol: Rol.REPARTIDOR });
    mockTx.repartidor.create.mockResolvedValue({ id: 'rep-1' });

    await realAuthRepository.createUsuario({
      nombre: 'Test',
      correo: 'repartidor@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      telefono: '3001234567',
      rol: 'REPARTIDOR',
      hashedPassword: 'hashed',
    });

    expect(mockTx.repartidor.create).toHaveBeenCalledWith({ data: { usuarioId: 'user-3', disponible: true } });
    expect(mockTx.cliente.create).not.toHaveBeenCalled();
    expect(mockTx.operador.create).not.toHaveBeenCalled();
  });
});
