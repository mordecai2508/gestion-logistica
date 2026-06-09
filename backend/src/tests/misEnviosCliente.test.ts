import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { envioRepository } from '../repositories/envioRepository';
import { clienteRepository } from '../repositories/clienteRepository';
import { Rol, EstadoEnvio } from '@prisma/client';

jest.mock('../repositories/envioRepository');
jest.mock('../repositories/clienteRepository');
jest.mock('../services/notificacionService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      cliente: { findUnique: jest.fn() },
      notificacion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      usuario: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedEnvioRepo = envioRepository as jest.Mocked<typeof envioRepository>;
const mockedClienteRepo = clienteRepository as jest.Mocked<typeof clienteRepository>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const mockCliente = {
  id: 'cliente-1',
  usuarioId: 'user-1',
};

function makeEnvioRecord(overrides: Partial<{
  id: string;
  codigoSeguimiento: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  peso: number;
  dimensiones: string;
  descripcion: string | null;
  estado: EstadoEnvio;
  clienteId: string;
  createdAt: Date;
  updatedAt: Date;
  rutaId: string | null;
  lat: number | null;
  lng: number | null;
  evidenciaFoto: string | null;
  firma: string | null;
  fechaReprogramacion: Date | null;
}> = {}) {
  return {
    id: 'envio-1',
    codigoSeguimiento: 'TRK-20260609-A3F9B21C',
    remitente: 'Remitente Test',
    destinatario: 'Destinatario Test',
    direccionDestino: 'Calle 123, Bogotá',
    peso: 2.5,
    dimensiones: '30x20x15',
    descripcion: null,
    estado: EstadoEnvio.PENDIENTE,
    clienteId: 'cliente-1',
    createdAt: new Date('2026-06-09T00:00:00.000Z'),
    updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    rutaId: null,
    lat: null,
    lng: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    ...overrides,
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/clientes/me/envios
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/clientes/me/envios', () => {
  it('R1 — debe retornar 200 con envíos del cliente autenticado (auth CLIENTE)', async () => {
    const token = makeToken(Rol.CLIENTE);
    mockedClienteRepo.findByUsuarioId.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findManyByClienteId.mockResolvedValue({
      envios: [makeEnvioRecord()],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/clientes/me/envios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Envíos obtenidos exitosamente');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].codigoSeguimiento).toBe('TRK-20260609-A3F9B21C');
    expect(res.body.data[0].destinatario).toBe('Destinatario Test');
    expect(res.body.data[0]).not.toHaveProperty('peso');
    expect(res.body.data[0]).not.toHaveProperty('dimensiones');
  });

  it('R2 — debe respetar paginación ?page=1&limit=2 con meta correcta', async () => {
    const token = makeToken(Rol.CLIENTE);
    mockedClienteRepo.findByUsuarioId.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findManyByClienteId.mockResolvedValue({
      envios: [makeEnvioRecord({ id: 'envio-1' }), makeEnvioRecord({ id: 'envio-2' })],
      total: 5,
    });

    const res = await request(app)
      .get('/api/v1/clientes/me/envios?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({
      total: 5,
      page: 1,
      limit: 2,
      totalPages: 3,
    });
    expect(mockedEnvioRepo.findManyByClienteId).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 2 }),
    );
  });

  it('R3 — debe filtrar por ?estado=ENTREGADO retornando solo envíos entregados', async () => {
    const token = makeToken(Rol.CLIENTE);
    mockedClienteRepo.findByUsuarioId.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findManyByClienteId.mockResolvedValue({
      envios: [makeEnvioRecord({ estado: EstadoEnvio.ENTREGADO })],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/clientes/me/envios?estado=ENTREGADO')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].estado).toBe('ENTREGADO');
    expect(mockedEnvioRepo.findManyByClienteId).toHaveBeenCalledWith(
      expect.objectContaining({ estado: EstadoEnvio.ENTREGADO }),
    );
  });

  it('R4 — debe retornar 401 sin token', async () => {
    const res = await request(app).get('/api/v1/clientes/me/envios');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
  });

  it('R5 — debe retornar 403 con token de rol OPERADOR', async () => {
    const token = makeToken(Rol.OPERADOR);

    const res = await request(app)
      .get('/api/v1/clientes/me/envios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('R6 — debe retornar lista vacía si el cliente no tiene envíos', async () => {
    const token = makeToken(Rol.CLIENTE);
    mockedClienteRepo.findByUsuarioId.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findManyByClienteId.mockResolvedValue({
      envios: [],
      total: 0,
    });

    const res = await request(app)
      .get('/api/v1/clientes/me/envios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ total: 0 });
  });

  it('R7 — debe retornar 404 si el usuarioId no tiene registro Cliente asociado', async () => {
    const token = makeToken(Rol.CLIENTE);
    mockedClienteRepo.findByUsuarioId.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/clientes/me/envios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('CLIENTE_NOT_FOUND');
  });
});
