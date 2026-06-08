import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { envioService } from '../services/envioService';
import { Rol, EstadoEnvio } from '@prisma/client';
import type { ReprogramarEnvioResponseDto } from '../types/envioTypes';

jest.mock('../repositories/envioRepository');
jest.mock('../services/envioService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findUnique: jest.fn(), update: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedEnvioService = envioService as jest.Mocked<typeof envioService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

const FECHA_FUTURA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 días
const FECHA_FUTURA_ISO = FECHA_FUTURA.toISOString();

const okResponse: ReprogramarEnvioResponseDto = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-20260604-A3F9B21C',
  estado: 'EN_TRANSITO',
  fechaReprogramacion: FECHA_FUTURA_ISO,
};

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/envios/:id/reprogramar — Reprogramación de entrega', () => {
  it('R19 - debe registrar la nueva fecha de reprogramación, crear el EventoEnvio correspondiente y devolver el envío actualizado', async () => {
    mockedEnvioService.reprogramar.mockResolvedValue(okResponse);

    const res = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Entrega reprogramada');
    expect(res.body.data.fechaReprogramacion).toBe(FECHA_FUTURA_ISO);
    expect(res.body.data.estado).toBe('EN_TRANSITO');
    expect(mockedEnvioService.reprogramar).toHaveBeenCalledWith(
      'envio-1',
      expect.objectContaining({ fechaReprogramacion: expect.any(Date) }),
    );
  });

  it('R20 - debe devolver 404 ENVIO_NOT_FOUND con un id de envío inexistente', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEnvioService.reprogramar.mockRejectedValue(
      new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404),
    );

    const res = await request(app)
      .post('/api/v1/envios/inexistente/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  it('R21 - debe devolver 422 con fechaReprogramacion ausente, no parseable o no futura', async () => {
    const resAusente = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({});
    expect(resAusente.status).toBe(422);
    expect(resAusente.body.error).toBe('VALIDATION_ERROR');

    const resNoParseable = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: 'esto-no-es-una-fecha' });
    expect(resNoParseable.status).toBe(422);
    expect(resNoParseable.body.error).toBe('VALIDATION_ERROR');

    const fechaPasada = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const resNoFutura = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: fechaPasada });
    expect(resNoFutura.status).toBe(422);
    expect(resNoFutura.body.error).toBe('VALIDATION_ERROR');

    expect(mockedEnvioService.reprogramar).not.toHaveBeenCalled();
  });

  it('R22 - debe devolver 409 INVALID_STATE_TRANSITION al reprogramar un envío ENTREGADO o CANCELADO', async () => {
    const { AppError } = await import('../lib/appError');

    mockedEnvioService.reprogramar.mockRejectedValueOnce(
      new AppError(
        'INVALID_STATE_TRANSITION',
        'No se puede reprogramar un envío en estado terminal',
        409,
      ),
    );
    const resEntregado = await request(app)
      .post('/api/v1/envios/envio-entregado/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });
    expect(resEntregado.status).toBe(409);
    expect(resEntregado.body.error).toBe('INVALID_STATE_TRANSITION');

    mockedEnvioService.reprogramar.mockRejectedValueOnce(
      new AppError(
        'INVALID_STATE_TRANSITION',
        'No se puede reprogramar un envío en estado terminal',
        409,
      ),
    );
    const resCancelado = await request(app)
      .post('/api/v1/envios/envio-cancelado/reprogramar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });
    expect(resCancelado.status).toBe(409);
    expect(resCancelado.body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('R23 - debe devolver 403 si el usuario autenticado no es OPERADOR', async () => {
    const resRepartidor = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });
    expect(resRepartidor.status).toBe(403);
    expect(resRepartidor.body.error).toBe('FORBIDDEN');

    const resCliente = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`)
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });
    expect(resCliente.status).toBe(403);
    expect(resCliente.body.error).toBe('FORBIDDEN');

    expect(mockedEnvioService.reprogramar).not.toHaveBeenCalled();
  });

  it('R24 - debe devolver 401 sin token de autenticación', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/reprogramar')
      .send({ fechaReprogramacion: FECHA_FUTURA_ISO });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedEnvioService.reprogramar).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// envioService.reprogramar — lógica de negocio (unit, real implementación + repo mockeado)
// ══════════════════════════════════════════════════════════════════════════════

type EnvioRepoMock = jest.Mocked<typeof import('../repositories/envioRepository').envioRepository>;
type EnvioServiceReal = typeof import('../services/envioService').envioService;

function loadServiceWithMockedRepo(): { service: EnvioServiceReal; repo: EnvioRepoMock } {
  let service!: EnvioServiceReal;
  let repo!: EnvioRepoMock;

  jest.isolateModules(() => {
    jest.unmock('../services/envioService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repo = require('../repositories/envioRepository').envioRepository as EnvioRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/envioService').envioService as EnvioServiceReal;
  });

  return { service, repo };
}

function makeEnvioConDetalle(overrides: Partial<{ estado: EstadoEnvio }> = {}) {
  return {
    id: 'envio-1',
    codigoSeguimiento: 'TRK-20260604-A3F9B21C',
    remitente: 'Juan Pérez',
    destinatario: 'María López',
    direccionDestino: 'Calle 123, Bogotá',
    peso: 2.5,
    dimensiones: '30x20x15',
    descripcion: null,
    estado: overrides.estado ?? EstadoEnvio.EN_TRANSITO,
    lat: null,
    lng: null,
    clienteId: 'cliente-1',
    rutaId: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    eventos: [],
    cliente: { id: 'cliente-1', usuarioId: 'user-cliente-1', usuario: {} },
  };
}

describe('envioService.reprogramar — lógica de negocio (unit, real implementación + repo mockeado)', () => {
  const dto = { fechaReprogramacion: FECHA_FUTURA };

  it('R19 - debe verificar existencia, delegar en el repositorio (sin cambiar Envio.estado) y devolver el DTO de respuesta', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.EN_TRANSITO }) as never);
    repo.reprogramar.mockResolvedValue({
      ...makeEnvioConDetalle({ estado: EstadoEnvio.EN_TRANSITO }),
      fechaReprogramacion: FECHA_FUTURA,
    } as never);

    const resultado = await service.reprogramar('envio-1', dto);

    expect(repo.findById).toHaveBeenCalledWith('envio-1');
    expect(repo.reprogramar).toHaveBeenCalledWith(
      'envio-1',
      expect.objectContaining({
        fechaReprogramacion: FECHA_FUTURA,
        descripcionEvento: expect.stringContaining('Entrega reprogramada para'),
      }),
    );
    // El estado del envío permanece intacto — la reprogramación NO lo modifica.
    expect(resultado.estado).toBe(EstadoEnvio.EN_TRANSITO);
    expect(resultado.fechaReprogramacion).toBe(FECHA_FUTURA.toISOString());
  });

  it('R20 - debe lanzar ENVIO_NOT_FOUND (404) y NO reprogramar cuando el envío no existe', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findById.mockResolvedValue(null);

    await expect(service.reprogramar('inexistente', dto)).rejects.toMatchObject({
      error: 'ENVIO_NOT_FOUND',
      statusCode: 404,
    });
    expect(repo.reprogramar).not.toHaveBeenCalled();
  });

  describe('R22 - bloqueo de reprogramación sobre envíos en estado terminal', () => {
    it('rechaza con 409 cuando el envío está ENTREGADO', async () => {
      const { service, repo } = loadServiceWithMockedRepo();

      repo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.ENTREGADO }) as never);

      await expect(service.reprogramar('envio-1', dto)).rejects.toMatchObject({
        error: 'INVALID_STATE_TRANSITION',
        statusCode: 409,
      });
      expect(repo.reprogramar).not.toHaveBeenCalled();
    });

    it('rechaza con 409 cuando el envío está CANCELADO', async () => {
      const { service, repo } = loadServiceWithMockedRepo();

      repo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.CANCELADO }) as never);

      await expect(service.reprogramar('envio-1', dto)).rejects.toMatchObject({
        error: 'INVALID_STATE_TRANSITION',
        statusCode: 409,
      });
      expect(repo.reprogramar).not.toHaveBeenCalled();
    });
  });
});
