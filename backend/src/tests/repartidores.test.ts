import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { repartidorService } from '../services/repartidorService';
import { Rol } from '@prisma/client';
import { AppError } from '../lib/appError';
import type { RepartidorDto, ListaRepartidoresResponse } from '../types/repartidorTypes';

jest.mock('../services/repartidorService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      repartidor: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      usuario: { findUnique: jest.fn() },
    })),
  };
});

const mockedService = repartidorService as jest.Mocked<typeof repartidorService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-op-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeRepartidorDto(overrides: Partial<RepartidorDto> = {}): RepartidorDto {
  return {
    id: 'rep-1',
    licencia: 'LIC-ABC-123',
    disponible: true,
    usuario: {
      id: 'user-rep-1',
      nombre: 'Carlos Repartidor',
      correo: 'carlos@example.com',
      telefono: '3001234567',
    },
    ...overrides,
  };
}

function makeListaResponse(overrides: Partial<ListaRepartidoresResponse> = {}): ListaRepartidoresResponse {
  return {
    data: [makeRepartidorDto()],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/repartidores — Listado de repartidores
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/repartidores — Listado de repartidores', () => {
  it('R1 — debe devolver lista paginada con datos de usuario incluidos', async () => {
    mockedService.listar.mockResolvedValue(makeListaResponse());

    const res = await request(app)
      .get('/api/v1/repartidores')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      id: 'rep-1',
      licencia: 'LIC-ABC-123',
      disponible: true,
      usuario: {
        nombre: 'Carlos Repartidor',
        correo: 'carlos@example.com',
        telefono: '3001234567',
      },
    });
    expect(res.body.meta).toBeDefined();
  });

  it('R2 — debe respetar parámetros page y limit y devolver meta correcta', async () => {
    const listaResponse = makeListaResponse({
      data: [makeRepartidorDto(), makeRepartidorDto({ id: 'rep-2', usuario: { id: 'u2', nombre: 'Ana', correo: 'ana@example.com', telefono: null } })],
      meta: { total: 5, page: 2, limit: 2, totalPages: 3 },
    });
    mockedService.listar.mockResolvedValue(listaResponse);

    const res = await request(app)
      .get('/api/v1/repartidores?page=2&limit=2')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 5, page: 2, limit: 2, totalPages: 3 });
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 2 }),
    );
  });

  it('R3 — debe filtrar por ?disponible=true', async () => {
    const listaFiltrada = makeListaResponse({
      data: [makeRepartidorDto({ disponible: true })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    mockedService.listar.mockResolvedValue(listaFiltrada);

    const res = await request(app)
      .get('/api/v1/repartidores?disponible=true')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ disponible: true }),
    );
  });

  it('R3 — debe filtrar por ?disponible=false', async () => {
    const listaFiltrada = makeListaResponse({
      data: [makeRepartidorDto({ disponible: false })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    mockedService.listar.mockResolvedValue(listaFiltrada);

    const res = await request(app)
      .get('/api/v1/repartidores?disponible=false')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ disponible: false }),
    );
  });

  it('R4 — debe devolver 401 sin token en GET /repartidores', async () => {
    const res = await request(app).get('/api/v1/repartidores');

    expect(res.status).toBe(401);
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R5 — debe devolver 403 con rol CLIENTE en GET /repartidores', async () => {
    const res = await request(app)
      .get('/api/v1/repartidores')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.listar).not.toHaveBeenCalled();
  });

  it('R5 — debe devolver 403 con rol REPARTIDOR en GET /repartidores', async () => {
    const res = await request(app)
      .get('/api/v1/repartidores')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.listar).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/repartidores/:id — Detalle de repartidor
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/repartidores/:id — Detalle de repartidor', () => {
  it('R6 — debe devolver detalle completo del repartidor por id', async () => {
    mockedService.obtenerPorId.mockResolvedValue(makeRepartidorDto());

    const res = await request(app)
      .get('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: 'rep-1',
      licencia: 'LIC-ABC-123',
      disponible: true,
      usuario: {
        nombre: 'Carlos Repartidor',
        correo: 'carlos@example.com',
        telefono: '3001234567',
      },
    });
    expect(mockedService.obtenerPorId).toHaveBeenCalledWith('rep-1');
  });

  it('R7 — debe devolver 404 para id inexistente en GET /repartidores/:id', async () => {
    mockedService.obtenerPorId.mockRejectedValue(
      new AppError('NOT_FOUND', 'Repartidor no encontrado', 404),
    );

    const res = await request(app)
      .get('/api/v1/repartidores/no-existe')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Repartidor no encontrado');
  });

  it('R8 — debe devolver 401 sin token en GET /repartidores/:id', async () => {
    const res = await request(app).get('/api/v1/repartidores/rep-1');

    expect(res.status).toBe(401);
    expect(mockedService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('R9 — debe devolver 403 con rol incorrecto en GET /repartidores/:id', async () => {
    const res = await request(app)
      .get('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.obtenerPorId).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/repartidores/:id — Actualización de repartidor
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/v1/repartidores/:id — Actualización de repartidor', () => {
  it('R10 — debe actualizar disponible y devolver repartidor actualizado', async () => {
    mockedService.actualizar.mockResolvedValue(makeRepartidorDto({ disponible: false }));

    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ disponible: false });

    expect(res.status).toBe(200);
    expect(res.body.data.disponible).toBe(false);
    expect(mockedService.actualizar).toHaveBeenCalledWith('rep-1', { disponible: false });
  });

  it('R10 — debe actualizar licencia y devolver repartidor actualizado', async () => {
    mockedService.actualizar.mockResolvedValue(makeRepartidorDto({ licencia: 'NUEVA-LIC-999' }));

    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ licencia: 'NUEVA-LIC-999' });

    expect(res.status).toBe(200);
    expect(res.body.data.licencia).toBe('NUEVA-LIC-999');
    expect(mockedService.actualizar).toHaveBeenCalledWith('rep-1', { licencia: 'NUEVA-LIC-999' });
  });

  it('R11 — debe devolver 422 cuando PATCH body está vacío', async () => {
    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(mockedService.actualizar).not.toHaveBeenCalled();
  });

  it('R12 — debe devolver 422 cuando licencia es string vacío', async () => {
    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ licencia: '' });

    expect(res.status).toBe(422);
    expect(mockedService.actualizar).not.toHaveBeenCalled();
  });

  it('R13 — debe devolver 404 para id inexistente en PATCH /repartidores/:id', async () => {
    mockedService.actualizar.mockRejectedValue(
      new AppError('NOT_FOUND', 'Repartidor no encontrado', 404),
    );

    const res = await request(app)
      .patch('/api/v1/repartidores/no-existe')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ disponible: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Repartidor no encontrado');
  });

  it('R14 — debe devolver 401 sin token en PATCH /repartidores/:id', async () => {
    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .send({ disponible: true });

    expect(res.status).toBe(401);
    expect(mockedService.actualizar).not.toHaveBeenCalled();
  });

  it('R15 — debe devolver 403 con rol incorrecto en PATCH /repartidores/:id', async () => {
    const res = await request(app)
      .patch('/api/v1/repartidores/rep-1')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ disponible: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedService.actualizar).not.toHaveBeenCalled();
  });
});
