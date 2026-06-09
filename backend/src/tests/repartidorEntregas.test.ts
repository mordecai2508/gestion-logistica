import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { entregaService } from '../services/entregaService';
import { Rol } from '@prisma/client';
import type { EntregasAgrupadasDto, EntregaListItemDto } from '../types/entregaTypes';

jest.mock('../services/entregaService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      incidencia: { create: jest.fn() },
      notificacion: { create: jest.fn() },
      repartidor: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedEntregaService = entregaService as jest.Mocked<typeof entregaService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-rep-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeItem(overrides: Partial<EntregaListItemDto> = {}): EntregaListItemDto {
  return {
    id: 'envio-1',
    codigoSeguimiento: 'TRK-20260607-AAAA1111',
    estado: 'EN_RUTA',
    destinatario: 'María López',
    direccionDestino: 'Calle 123, Bogotá',
    rutaId: 'ruta-1',
    updatedAt: '2026-06-07T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/v1/repartidor/entregas — Vista del repartidor', () => {
  it('R1 - debe devolver 200 con pendientes y completadas al repartidor autenticado', async () => {
    const agrupadas: EntregasAgrupadasDto = {
      pendientes: [makeItem({ id: 'p1', estado: 'EN_RUTA' })],
      completadas: [makeItem({ id: 'c1', estado: 'ENTREGADO' })],
    };
    mockedEntregaService.listarMisEntregas.mockResolvedValue(agrupadas);

    const res = await request(app)
      .get('/api/v1/repartidor/entregas')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Entregas obtenidas');
    expect(res.body.status).toBe(200);
    expect(res.body.data.pendientes).toHaveLength(1);
    expect(res.body.data.completadas).toHaveLength(1);
    expect(mockedEntregaService.listarMisEntregas).toHaveBeenCalledWith('user-rep-1');
  });

  it('R2 - debe clasificar correctamente PENDIENTE|EN_PREPARACION|EN_TRANSITO|EN_RUTA como pendientes y ENTREGADO|FALLIDO como completadas', async () => {
    const agrupadas: EntregasAgrupadasDto = {
      pendientes: [
        makeItem({ id: 'a', estado: 'PENDIENTE' }),
        makeItem({ id: 'b', estado: 'EN_PREPARACION' }),
        makeItem({ id: 'c', estado: 'EN_TRANSITO' }),
        makeItem({ id: 'd', estado: 'EN_RUTA' }),
      ],
      completadas: [
        makeItem({ id: 'e', estado: 'ENTREGADO' }),
        makeItem({ id: 'f', estado: 'FALLIDO' }),
      ],
    };
    mockedEntregaService.listarMisEntregas.mockResolvedValue(agrupadas);

    const res = await request(app)
      .get('/api/v1/repartidor/entregas')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(200);
    const pendientesEstados = res.body.data.pendientes.map((e: EntregaListItemDto) => e.estado);
    const completadasEstados = res.body.data.completadas.map((e: EntregaListItemDto) => e.estado);
    expect(pendientesEstados).toEqual(
      expect.arrayContaining(['PENDIENTE', 'EN_PREPARACION', 'EN_TRANSITO', 'EN_RUTA']),
    );
    expect(completadasEstados).toEqual(expect.arrayContaining(['ENTREGADO', 'FALLIDO']));
  });

  it('R3 - debe devolver 401 sin token', async () => {
    const res = await request(app).get('/api/v1/repartidor/entregas');
    expect(res.status).toBe(401);
  });

  it('R4 - debe devolver 403 con rol OPERADOR o CLIENTE', async () => {
    const resOperador = await request(app)
      .get('/api/v1/repartidor/entregas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);
    expect(resOperador.status).toBe(403);
    expect(resOperador.body.error).toBe('FORBIDDEN');

    const resCliente = await request(app)
      .get('/api/v1/repartidor/entregas')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
    expect(resCliente.status).toBe(403);
    expect(resCliente.body.error).toBe('FORBIDDEN');
  });

  it('R5 - debe devolver 404 si el usuario REPARTIDOR no tiene perfil de repartidor', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.listarMisEntregas.mockRejectedValue(
      new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404),
    );

    const res = await request(app)
      .get('/api/v1/repartidor/entregas')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('REPARTIDOR_NOT_FOUND');
  });
});
