import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { usuarioService } from '../services/usuarioService';
import { authRepository } from '../repositories/authRepository';
import { Rol } from '@prisma/client';
import { AppError } from '../lib/appError';
import type { UsuarioDto, ListaUsuariosResponse } from '../types/usuarioTypes';

jest.mock('../services/usuarioService');
jest.mock('../repositories/authRepository');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      usuario: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    })),
  };
});

const mockedService = usuarioService as jest.Mocked<typeof usuarioService>;
const mockedAuthRepo = authRepository as jest.Mocked<typeof authRepository>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-op-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_ID = 'user-op-1';
const OPERADOR_TOKEN = makeToken('OPERADOR', OPERADOR_ID);
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeUsuarioDto(overrides: Partial<UsuarioDto> = {}): UsuarioDto {
  return {
    id: 'user-1',
    nombre: 'Ana Cliente',
    correo: 'ana@example.com',
    rol: Rol.CLIENTE,
    telefono: '3001234567',
    activo: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

function makeListaResponse(overrides: Partial<ListaUsuariosResponse> = {}): ListaUsuariosResponse {
  return {
    data: [makeUsuarioDto()],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/usuarios — Listado de usuarios
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/usuarios — Listado de usuarios', () => {
  it('R1 — debe devolver lista paginada de usuarios con id/nombre/correo/rol/telefono/activo/createdAt', async () => {
    mockedService.listar.mockResolvedValue(makeListaResponse());

    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      id: 'user-1',
      nombre: 'Ana Cliente',
      correo: 'ana@example.com',
      rol: 'CLIENTE',
      telefono: '3001234567',
      activo: true,
      createdAt: expect.any(String),
    });
    expect(res.body.meta).toBeDefined();
  });

  it('R2 — debe respetar parámetros page y limit y devolver meta correcta', async () => {
    const listaResponse = makeListaResponse({
      data: [makeUsuarioDto(), makeUsuarioDto({ id: 'user-2', nombre: 'Beto' })],
      meta: { total: 5, page: 2, limit: 2, totalPages: 3 },
    });
    mockedService.listar.mockResolvedValue(listaResponse);

    const res = await request(app)
      .get('/api/v1/usuarios?page=2&limit=2')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 5, page: 2, limit: 2, totalPages: 3 });
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 2 }),
    );
  });

  it('R3 — debe filtrar por ?rol=CLIENTE', async () => {
    mockedService.listar.mockResolvedValue(
      makeListaResponse({ data: [makeUsuarioDto({ rol: Rol.CLIENTE })] }),
    );

    const res = await request(app)
      .get('/api/v1/usuarios?rol=CLIENTE')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'CLIENTE' }),
    );
  });

  it('R3 — debe filtrar por ?rol=OPERADOR', async () => {
    mockedService.listar.mockResolvedValue(
      makeListaResponse({ data: [makeUsuarioDto({ rol: Rol.OPERADOR })] }),
    );

    const res = await request(app)
      .get('/api/v1/usuarios?rol=OPERADOR')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'OPERADOR' }),
    );
  });

  it('R3 — debe filtrar por ?rol=REPARTIDOR', async () => {
    mockedService.listar.mockResolvedValue(
      makeListaResponse({ data: [makeUsuarioDto({ rol: Rol.REPARTIDOR })] }),
    );

    const res = await request(app)
      .get('/api/v1/usuarios?rol=REPARTIDOR')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'REPARTIDOR' }),
    );
  });

  it('R4 — debe devolver 422 si ?rol tiene un valor no permitido', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios?rol=ADMIN')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R5 — debe devolver 401 sin token en GET /usuarios', async () => {
    const res = await request(app).get('/api/v1/usuarios');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R6 — debe devolver 403 con rol CLIENTE en GET /usuarios', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R6 — debe devolver 403 con rol REPARTIDOR en GET /usuarios', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R7 — la respuesta de GET /usuarios no debe incluir el campo password', async () => {
    mockedService.listar.mockResolvedValue(makeListaResponse());

    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((usuario: Record<string, unknown>) => {
      expect(usuario).not.toHaveProperty('password');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/usuarios/:id — Detalle de usuario
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/usuarios/:id — Detalle de usuario', () => {
  it('R8 — debe devolver detalle completo del usuario por id', async () => {
    mockedService.obtenerPorId.mockResolvedValue(makeUsuarioDto());

    const res = await request(app)
      .get('/api/v1/usuarios/user-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: 'user-1',
      nombre: 'Ana Cliente',
      correo: 'ana@example.com',
      rol: 'CLIENTE',
      telefono: '3001234567',
      activo: true,
      createdAt: expect.any(String),
    });
    expect(mockedService.obtenerPorId).toHaveBeenCalledWith('user-1');
  });

  it('R9 — debe devolver 404 para id inexistente en GET /usuarios/:id', async () => {
    mockedService.obtenerPorId.mockRejectedValue(
      new AppError('NOT_FOUND', 'Usuario no encontrado', 404),
    );

    const res = await request(app)
      .get('/api/v1/usuarios/no-existe')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Usuario no encontrado');
  });

  it('R10 — debe devolver 401 sin token en GET /usuarios/:id', async () => {
    const res = await request(app).get('/api/v1/usuarios/user-1');

    expect(res.status).toBe(401);
    expect(mockedService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('R11 — debe devolver 403 con rol incorrecto en GET /usuarios/:id', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios/user-1')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('R12 — la respuesta de GET /usuarios/:id no debe incluir el campo password', async () => {
    mockedService.obtenerPorId.mockResolvedValue(makeUsuarioDto());

    const res = await request(app)
      .get('/api/v1/usuarios/user-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/usuarios/:id/estado — Activar / desactivar usuario
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/v1/usuarios/:id/estado — Activar / desactivar usuario', () => {
  it('R13 — debe activar un usuario (activo: true) y devolver el usuario actualizado', async () => {
    mockedService.actualizarEstado.mockResolvedValue(makeUsuarioDto({ id: 'user-2', activo: true }));

    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ activo: true });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(true);
    expect(mockedService.actualizarEstado).toHaveBeenCalledWith(
      'user-2',
      { activo: true },
      OPERADOR_ID,
    );
  });

  it('R13 — debe desactivar un usuario (activo: false) y devolver el usuario actualizado', async () => {
    mockedService.actualizarEstado.mockResolvedValue(makeUsuarioDto({ id: 'user-2', activo: false }));

    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
    expect(mockedService.actualizarEstado).toHaveBeenCalledWith(
      'user-2',
      { activo: false },
      OPERADOR_ID,
    );
  });

  it('R14 — debe devolver 422 cuando el body no contiene activo como boolean', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ activo: 'true' });

    expect(res.status).toBe(422);
    expect(mockedService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R14 — debe devolver 422 cuando el body no contiene el campo activo', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(mockedService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R15 — debe devolver 404 para id inexistente en PATCH /usuarios/:id/estado', async () => {
    mockedService.actualizarEstado.mockRejectedValue(
      new AppError('NOT_FOUND', 'Usuario no encontrado', 404),
    );

    const res = await request(app)
      .patch('/api/v1/usuarios/no-existe/estado')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ activo: false });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Usuario no encontrado');
  });

  it('R16 — debe devolver 409 CANNOT_DEACTIVATE_SELF cuando el operador intenta cambiar su propio estado, sin modificar activo', async () => {
    mockedService.actualizarEstado.mockRejectedValue(
      new AppError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta', 409),
    );

    const res = await request(app)
      .patch(`/api/v1/usuarios/${OPERADOR_ID}/estado`)
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ activo: false });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CANNOT_DEACTIVATE_SELF');
    expect(res.body.message).toBe('No puedes desactivar tu propia cuenta');
    expect(mockedService.actualizarEstado).toHaveBeenCalledWith(
      OPERADOR_ID,
      { activo: false },
      OPERADOR_ID,
    );
  });

  it('R17 — debe devolver 401 sin token en PATCH /usuarios/:id/estado', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .send({ activo: false });

    expect(res.status).toBe(401);
    expect(mockedService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R18 — debe devolver 403 con rol incorrecto en PATCH /usuarios/:id/estado', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/user-2/estado')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ activo: false });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.actualizarEstado).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/login — Bloqueo de inicio de sesión para cuentas inactivas
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/login — Bloqueo de cuentas inactivas', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    hashedPassword = await bcrypt.hash('password123', 12);
  });

  function makeInactiveUser(overrides: Partial<{ activo: boolean }> = {}) {
    return {
      id: 'user-inactive-1',
      nombre: 'Usuario Inactivo',
      correo: 'inactivo@example.com',
      password: hashedPassword,
      telefono: null,
      rol: Rol.CLIENTE,
      activo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('R19 R20 R21 — debe devolver 403 USER_INACTIVE con credenciales correctas y activo=false, sin emitir accessToken ni cookie refreshToken', async () => {
    mockedAuthRepo.findByCorreo.mockResolvedValue(makeInactiveUser());

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'inactivo@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('USER_INACTIVE');
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body.data).toBeUndefined();

    const rawCookies = res.headers['set-cookie'];
    const cookies = rawCookies
      ? Array.isArray(rawCookies)
        ? rawCookies
        : [rawCookies as string]
      : [];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeUndefined();
  });

  it('R20 — debe seguir devolviendo 401 INVALID_CREDENTIALS si la contraseña es incorrecta para un usuario con activo=false', async () => {
    mockedAuthRepo.findByCorreo.mockResolvedValue(makeInactiveUser());

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'inactivo@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });
});
