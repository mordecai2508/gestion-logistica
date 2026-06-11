import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { incidenciaService } from '../services/incidenciaService';
import { Rol, TipoIncidencia, EstadoIncidencia, EstadoEnvio } from '@prisma/client';
import type { IncidenciaDto, PaginatedIncidenciasResponse } from '../types/incidenciaTypes';

jest.mock('../repositories/incidenciaRepository');
jest.mock('../repositories/envioRepository');
jest.mock('../services/incidenciaService');
jest.mock('../services/notificacionService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      incidencia: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      envio: { findUnique: jest.fn() },
      notificacion: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      usuario: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedIncidenciaService = incidenciaService as jest.Mocked<typeof incidenciaService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeIncidenciaDto(overrides: Partial<IncidenciaDto> = {}): IncidenciaDto {
  return {
    id: 'incidencia-1',
    tipo: TipoIncidencia.CLIENTE_AUSENTE,
    descripcion: 'El cliente no se encontraba en la dirección',
    estado: EstadoIncidencia.ABIERTA,
    foto: null,
    nota: null,
    envioId: 'envio-1',
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
    ...overrides,
  };
}

const validPayload = {
  envioId: 'clhqzv2k10000qwer5678abcd',
  tipo: TipoIncidencia.CLIENTE_AUSENTE,
  descripcion: 'El cliente no se encontraba en la dirección registrada',
};

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/incidencias — Creación (R1-R5)
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/incidencias — Creación de incidencia', () => {
  it('R1 - debe crear la incidencia vinculada al envío con estado ABIERTA y devolver 201', async () => {
    const creada = makeIncidenciaDto({ id: 'incidencia-nueva' });
    mockedIncidenciaService.crear.mockResolvedValue(creada);

    const res = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Incidencia registrada');
    expect(res.body.data.id).toBe('incidencia-nueva');
    expect(res.body.data.estado).toBe('ABIERTA');
    expect(mockedIncidenciaService.crear).toHaveBeenCalledWith(validPayload);
  });

  it('R2 - debe devolver 404 ENVIO_NOT_FOUND al crear una incidencia sobre un envío inexistente', async () => {
    const { AppError } = await import('../lib/appError');
    mockedIncidenciaService.crear.mockRejectedValue(
      new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404),
    );

    const res = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  it('R3 - debe devolver 422 con descripción vacía, tipo inválido o envioId faltante', async () => {
    const resDescripcionVacia = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ ...validPayload, descripcion: '' });
    expect(resDescripcionVacia.status).toBe(422);
    expect(resDescripcionVacia.body.error).toBe('VALIDATION_ERROR');

    const resTipoInvalido = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ ...validPayload, tipo: 'TIPO_INEXISTENTE' });
    expect(resTipoInvalido.status).toBe(422);
    expect(resTipoInvalido.body.error).toBe('VALIDATION_ERROR');

    const resSinEnvioId = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ tipo: TipoIncidencia.OTRO, descripcion: 'Sin envioId' });
    expect(resSinEnvioId.status).toBe(422);
    expect(resSinEnvioId.body.error).toBe('VALIDATION_ERROR');

    expect(mockedIncidenciaService.crear).not.toHaveBeenCalled();
  });

  it('R4 - debe devolver 403 si el usuario autenticado no es REPARTIDOR', async () => {
    const resOperador = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);
    expect(resOperador.status).toBe(403);
    expect(resOperador.body.error).toBe('FORBIDDEN');

    const resCliente = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`)
      .send(validPayload);
    expect(resCliente.status).toBe(403);
    expect(resCliente.body.error).toBe('FORBIDDEN');

    expect(mockedIncidenciaService.crear).not.toHaveBeenCalled();
  });

  it('R5 - debe devolver 401 sin token de autenticación', async () => {
    const res = await request(app).post('/api/v1/incidencias').send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedIncidenciaService.crear).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/incidencias — Listado y filtros (R6-R12)
// ──────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/incidencias — Listado y filtros', () => {
  function makePaginatedResponse(
    overrides: Partial<PaginatedIncidenciasResponse> = {},
  ): PaginatedIncidenciasResponse {
    return {
      data: [
        {
          id: 'incidencia-1',
          tipo: TipoIncidencia.CLIENTE_AUSENTE,
          descripcion: 'El cliente no se encontraba',
          estado: EstadoIncidencia.ABIERTA,
          envioId: 'envio-1',
          envioCodigoSeguimiento: 'TRK-20260604-A3F9B21C',
          createdAt: new Date('2026-06-04T00:00:00.000Z'),
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      ...overrides,
    };
  }

  it('R6 - debe listar incidencias paginadas ordenadas por más reciente, incluyendo código del envío', async () => {
    mockedIncidenciaService.listar.mockResolvedValue(makePaginatedResponse());

    const res = await request(app)
      .get('/api/v1/incidencias')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Incidencias obtenidas');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].envioCodigoSeguimiento).toBe('TRK-20260604-A3F9B21C');
    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('R7 - debe filtrar por ?tipo', async () => {
    mockedIncidenciaService.listar.mockResolvedValue(makePaginatedResponse());

    const res = await request(app)
      .get('/api/v1/incidencias')
      .query({ tipo: TipoIncidencia.CLIENTE_AUSENTE })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedIncidenciaService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: TipoIncidencia.CLIENTE_AUSENTE }),
    );
  });

  it('R8 - debe filtrar por ?estado', async () => {
    mockedIncidenciaService.listar.mockResolvedValue(makePaginatedResponse());

    const res = await request(app)
      .get('/api/v1/incidencias')
      .query({ estado: EstadoIncidencia.EN_PROCESO })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedIncidenciaService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: EstadoIncidencia.EN_PROCESO }),
    );
  });

  it('R9 - debe combinar ?tipo&estado', async () => {
    mockedIncidenciaService.listar.mockResolvedValue(makePaginatedResponse());

    const res = await request(app)
      .get('/api/v1/incidencias')
      .query({ tipo: TipoIncidencia.DANIO, estado: EstadoIncidencia.ABIERTA })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedIncidenciaService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: TipoIncidencia.DANIO, estado: EstadoIncidencia.ABIERTA }),
    );
  });

  it('R10 - debe devolver 422 con tipo/estado/paginación inválidos', async () => {
    const resTipo = await request(app)
      .get('/api/v1/incidencias')
      .query({ tipo: 'TIPO_INEXISTENTE' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);
    expect(resTipo.status).toBe(422);
    expect(resTipo.body.error).toBe('VALIDATION_ERROR');

    const resEstado = await request(app)
      .get('/api/v1/incidencias')
      .query({ estado: 'ESTADO_INEXISTENTE' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);
    expect(resEstado.status).toBe(422);
    expect(resEstado.body.error).toBe('VALIDATION_ERROR');

    const resPaginacion = await request(app)
      .get('/api/v1/incidencias')
      .query({ page: '0', limit: '-5' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);
    expect(resPaginacion.status).toBe(422);
    expect(resPaginacion.body.error).toBe('VALIDATION_ERROR');

    expect(mockedIncidenciaService.listar).not.toHaveBeenCalled();
  });

  it('R11 - debe devolver 403 si el usuario autenticado no es OPERADOR', async () => {
    const resRepartidor = await request(app)
      .get('/api/v1/incidencias')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);
    expect(resRepartidor.status).toBe(403);
    expect(resRepartidor.body.error).toBe('FORBIDDEN');
    expect(resRepartidor.body.data).toBeUndefined();

    expect(mockedIncidenciaService.listar).not.toHaveBeenCalled();
  });

  it('R12 - debe devolver 401 sin token', async () => {
    const res = await request(app).get('/api/v1/incidencias');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedIncidenciaService.listar).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/incidencias/:id — Cambio de estado (R13-R18)
// ──────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/incidencias/:id — Cambio de estado', () => {
  it('R13 - debe actualizar el estado de la incidencia y devolverla actualizada', async () => {
    const actualizada = makeIncidenciaDto({ estado: EstadoIncidencia.EN_PROCESO });
    mockedIncidenciaService.actualizarEstado.mockResolvedValue(actualizada);

    const res = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: EstadoIncidencia.EN_PROCESO });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Estado de incidencia actualizado');
    expect(res.body.data.estado).toBe('EN_PROCESO');
    expect(mockedIncidenciaService.actualizarEstado).toHaveBeenCalledWith(
      'incidencia-1',
      EstadoIncidencia.EN_PROCESO,
    );
  });

  it('R14 - debe devolver 404 INCIDENCIA_NOT_FOUND con un id inexistente', async () => {
    const { AppError } = await import('../lib/appError');
    mockedIncidenciaService.actualizarEstado.mockRejectedValue(
      new AppError('INCIDENCIA_NOT_FOUND', 'Incidencia no encontrada', 404),
    );

    const res = await request(app)
      .patch('/api/v1/incidencias/inexistente')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: EstadoIncidencia.EN_PROCESO });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('INCIDENCIA_NOT_FOUND');
  });

  it('R15 - debe devolver 409 al repetir el mismo estado y al intentar mover una incidencia RESUELTA a otro estado', async () => {
    const { AppError } = await import('../lib/appError');

    mockedIncidenciaService.actualizarEstado.mockRejectedValueOnce(
      new AppError('INVALID_STATE_TRANSITION', 'La incidencia ya se encuentra en ese estado', 409),
    );
    const resMismoEstado = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: EstadoIncidencia.ABIERTA });
    expect(resMismoEstado.status).toBe(409);
    expect(resMismoEstado.body.error).toBe('INVALID_STATE_TRANSITION');

    mockedIncidenciaService.actualizarEstado.mockRejectedValueOnce(
      new AppError('INVALID_STATE_TRANSITION', 'No se puede reabrir una incidencia resuelta', 409),
    );
    const resDesdeResuelta = await request(app)
      .patch('/api/v1/incidencias/incidencia-resuelta')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: EstadoIncidencia.ABIERTA });
    expect(resDesdeResuelta.status).toBe(409);
    expect(resDesdeResuelta.body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('R16 - debe devolver 422 con estado ausente o fuera del enum', async () => {
    const resSinEstado = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({});
    expect(resSinEstado.status).toBe(422);
    expect(resSinEstado.body.error).toBe('VALIDATION_ERROR');

    const resEstadoInvalido = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: 'ESTADO_INEXISTENTE' });
    expect(resEstadoInvalido.status).toBe(422);
    expect(resEstadoInvalido.body.error).toBe('VALIDATION_ERROR');

    expect(mockedIncidenciaService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R17 - debe devolver 403 si el usuario autenticado no es OPERADOR', async () => {
    const res = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ estado: EstadoIncidencia.EN_PROCESO });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedIncidenciaService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R18 - debe devolver 401 sin token', async () => {
    const res = await request(app)
      .patch('/api/v1/incidencias/incidencia-1')
      .send({ estado: EstadoIncidencia.EN_PROCESO });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedIncidenciaService.actualizarEstado).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// incidenciaService — lógica de negocio (unit, real implementación + repos mockeados)
//
// Replica el patrón ya aprobado en `rutas.test.ts`/`vehiculos.test.ts`:
// `jest.isolateModules` + `jest.unmock` carga la implementación REAL del
// servicio (no el doble del `jest.mock` de nivel superior) junto con los
// repositorios auto-mockeados que invoca, para verificar que la lógica
// condicional (verificación de existencia, reglas de transición de estado,
// construcción del `where` con filtros) decide correctamente.
// ══════════════════════════════════════════════════════════════════════════════

type IncidenciaRepoMock = jest.Mocked<
  typeof import('../repositories/incidenciaRepository').incidenciaRepository
>;
type EnvioRepoMock = jest.Mocked<typeof import('../repositories/envioRepository').envioRepository>;
type NotificacionServiceMock = jest.Mocked<
  typeof import('../services/notificacionService').notificacionService
>;
type IncidenciaServiceReal = typeof import('../services/incidenciaService').incidenciaService;

function loadServiceWithMockedRepos(): {
  service: IncidenciaServiceReal;
  incidenciaRepo: IncidenciaRepoMock;
  envioRepo: EnvioRepoMock;
  notifService: NotificacionServiceMock;
} {
  let service!: IncidenciaServiceReal;
  let incidenciaRepo!: IncidenciaRepoMock;
  let envioRepo!: EnvioRepoMock;
  let notifService!: NotificacionServiceMock;

  jest.isolateModules(() => {
    jest.unmock('../services/incidenciaService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    incidenciaRepo = require('../repositories/incidenciaRepository')
      .incidenciaRepository as IncidenciaRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    envioRepo = require('../repositories/envioRepository').envioRepository as EnvioRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifService = require('../services/notificacionService')
      .notificacionService as NotificacionServiceMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/incidenciaService').incidenciaService as IncidenciaServiceReal;
  });

  return { service, incidenciaRepo, envioRepo, notifService };
}

/**
 * Construye un `EnvioConDetalle` (tipo de `envioRepository.findById`) para los
 * tests de reactivación (R1-R6 de `entregas_reactivar_fallida`). `estado` es
 * configurable para cubrir los casos FALLIDO (reactivación) y no-FALLIDO (R6).
 */
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
    estado: 'FALLIDO' as EstadoEnvio,
    clienteId: 'cliente-1',
    rutaId: null,
    lat: null,
    lng: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
    eventos: [],
    cliente: {
      id: 'cliente-1',
      usuarioId: 'user-cliente-1',
      usuario: {
        id: 'user-cliente-1',
        nombre: 'Cliente Test',
        correo: 'cliente@test.com',
        password: 'hashed',
        telefono: null,
        rol: 'CLIENTE',
        activo: true,
        createdAt: new Date('2026-06-04T00:00:00.000Z'),
        updatedAt: new Date('2026-06-04T00:00:00.000Z'),
      },
    },
    ...overrides,
  };
}

function makeEnvioRecord() {
  return {
    id: 'envio-1',
    codigoSeguimiento: 'TRK-20260604-A3F9B21C',
    remitente: 'Juan Pérez',
    destinatario: 'María López',
    direccionDestino: 'Calle 123, Bogotá',
    peso: 2.5,
    dimensiones: '30x20x15',
    descripcion: null,
    estado: 'PENDIENTE' as const,
    clienteId: 'cliente-1',
    rutaId: null,
    lat: null,
    lng: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    eventos: [],
    cliente: { id: 'cliente-1', usuarioId: 'user-cliente-1', usuario: {} },
  };
}

function makeIncidenciaRecord(overrides: Partial<{
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  foto: string | null;
  nota: string | null;
  envioId: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: 'incidencia-1',
    tipo: TipoIncidencia.CLIENTE_AUSENTE,
    descripcion: 'El cliente no se encontraba',
    estado: EstadoIncidencia.ABIERTA,
    foto: null,
    nota: null,
    envioId: 'envio-1',
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
    ...overrides,
  };
}

describe('incidenciaService — lógica de negocio (unit, real implementación + repos mockeados)', () => {
  const crearDto = {
    envioId: 'envio-1',
    tipo: TipoIncidencia.CLIENTE_AUSENTE,
    descripcion: 'El cliente no se encontraba en la dirección',
  };

  it('R1 - debe verificar la existencia del envío y crear la incidencia con estado ABIERTA', async () => {
    const { service, incidenciaRepo, envioRepo } = loadServiceWithMockedRepos();

    envioRepo.findById.mockResolvedValue(makeEnvioRecord() as never);
    incidenciaRepo.crear.mockResolvedValue(makeIncidenciaRecord({ id: 'incidencia-nueva' }));

    const resultado = await service.crear(crearDto);

    expect(envioRepo.findById).toHaveBeenCalledWith('envio-1');
    expect(incidenciaRepo.crear).toHaveBeenCalledWith(crearDto);
    expect(resultado.id).toBe('incidencia-nueva');
    expect(resultado.estado).toBe('ABIERTA');
  });

  it('R2 - debe lanzar ENVIO_NOT_FOUND (404) y NO crear cuando el envío no existe', async () => {
    const { service, incidenciaRepo, envioRepo } = loadServiceWithMockedRepos();

    envioRepo.findById.mockResolvedValue(null);

    await expect(service.crear(crearDto)).rejects.toMatchObject({
      error: 'ENVIO_NOT_FOUND',
      statusCode: 404,
    });
    expect(incidenciaRepo.crear).not.toHaveBeenCalled();
  });

  it('R6/R9 - debe combinar filtros tipo y estado en el where, paginar y proyectar al DTO con código de envío', async () => {
    const { service, incidenciaRepo } = loadServiceWithMockedRepos();

    incidenciaRepo.findMany.mockResolvedValue([
      {
        ...makeIncidenciaRecord(),
        envio: { codigoSeguimiento: 'TRK-20260604-A3F9B21C' },
      } as never,
    ]);
    incidenciaRepo.count.mockResolvedValue(1);

    const resultado = await service.listar({
      page: 1,
      limit: 20,
      tipo: TipoIncidencia.CLIENTE_AUSENTE,
      estado: EstadoIncidencia.ABIERTA,
    });

    expect(incidenciaRepo.findMany).toHaveBeenCalledWith(
      { tipo: TipoIncidencia.CLIENTE_AUSENTE, estado: EstadoIncidencia.ABIERTA },
      0,
      20,
    );
    expect(resultado.data[0].envioCodigoSeguimiento).toBe('TRK-20260604-A3F9B21C');
    expect(resultado.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('R7 - debe construir el where solo con el filtro tipo cuando estado no viene definido', async () => {
    const { service, incidenciaRepo } = loadServiceWithMockedRepos();

    incidenciaRepo.findMany.mockResolvedValue([]);
    incidenciaRepo.count.mockResolvedValue(0);

    await service.listar({ page: 1, limit: 20, tipo: TipoIncidencia.DANIO });

    expect(incidenciaRepo.findMany).toHaveBeenCalledWith(
      { tipo: TipoIncidencia.DANIO },
      0,
      20,
    );
  });

  it('R8 - debe construir el where solo con el filtro estado cuando tipo no viene definido', async () => {
    const { service, incidenciaRepo } = loadServiceWithMockedRepos();

    incidenciaRepo.findMany.mockResolvedValue([]);
    incidenciaRepo.count.mockResolvedValue(0);

    await service.listar({ page: 1, limit: 20, estado: EstadoIncidencia.EN_PROCESO });

    expect(incidenciaRepo.findMany).toHaveBeenCalledWith(
      { estado: EstadoIncidencia.EN_PROCESO },
      0,
      20,
    );
  });

  it('R13 - debe verificar existencia, delegar la actualización en el repositorio y devolver el DTO actualizado', async () => {
    const { service, incidenciaRepo } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ estado: EstadoIncidencia.ABIERTA }),
    );
    incidenciaRepo.actualizarEstado.mockResolvedValue(
      makeIncidenciaRecord({ estado: EstadoIncidencia.EN_PROCESO }),
    );

    const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.EN_PROCESO);

    expect(incidenciaRepo.findById).toHaveBeenCalledWith('incidencia-1');
    expect(incidenciaRepo.actualizarEstado).toHaveBeenCalledWith(
      'incidencia-1',
      EstadoIncidencia.EN_PROCESO,
    );
    expect(resultado.estado).toBe('EN_PROCESO');
  });

  it('R14 - debe lanzar INCIDENCIA_NOT_FOUND (404) y NO actualizar cuando la incidencia no existe', async () => {
    const { service, incidenciaRepo } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(null);

    await expect(
      service.actualizarEstado('inexistente', EstadoIncidencia.EN_PROCESO),
    ).rejects.toMatchObject({ error: 'INCIDENCIA_NOT_FOUND', statusCode: 404 });
    expect(incidenciaRepo.actualizarEstado).not.toHaveBeenCalled();
  });

  describe('R15 - bloqueo de transiciones inválidas de estado', () => {
    it('rechaza con 409 cuando el nuevo estado es igual al estado actual', async () => {
      const { service, incidenciaRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(
        makeIncidenciaRecord({ estado: EstadoIncidencia.ABIERTA }),
      );

      await expect(
        service.actualizarEstado('incidencia-1', EstadoIncidencia.ABIERTA),
      ).rejects.toMatchObject({ error: 'INVALID_STATE_TRANSITION', statusCode: 409 });
      expect(incidenciaRepo.actualizarEstado).not.toHaveBeenCalled();
    });

    it('rechaza con 409 cuando se intenta mover una incidencia RESUELTA a otro estado', async () => {
      const { service, incidenciaRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(
        makeIncidenciaRecord({ estado: EstadoIncidencia.RESUELTA }),
      );

      await expect(
        service.actualizarEstado('incidencia-1', EstadoIncidencia.EN_PROCESO),
      ).rejects.toMatchObject({ error: 'INVALID_STATE_TRANSITION', statusCode: 409 });
      expect(incidenciaRepo.actualizarEstado).not.toHaveBeenCalled();
    });

    it('permite la transición EN_PROCESO → ABIERTA (no lanza y delega en el repositorio)', async () => {
      const { service, incidenciaRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(
        makeIncidenciaRecord({ estado: EstadoIncidencia.EN_PROCESO }),
      );
      incidenciaRepo.actualizarEstado.mockResolvedValue(
        makeIncidenciaRecord({ estado: EstadoIncidencia.ABIERTA }),
      );

      const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.ABIERTA);

      expect(incidenciaRepo.actualizarEstado).toHaveBeenCalledWith(
        'incidencia-1',
        EstadoIncidencia.ABIERTA,
      );
      expect(resultado.estado).toBe('ABIERTA');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// incidenciaService.actualizarEstado — Reactivación de envío FALLIDO (HU61)
// entregas_reactivar_fallida (R1-R7)
// ══════════════════════════════════════════════════════════════════════════════

describe('incidenciaService.actualizarEstado — reactivación de envío al resolver ENTREGA_FALLIDA', () => {
  it('R1/R2/R3 - debe reactivar el envío FALLIDO a EN_RUTA y registrar el EventoEnvio de reactivación dentro de una única transacción', async () => {
    const { service, incidenciaRepo, envioRepo, notifService } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.ABIERTA }),
    );
    envioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: 'FALLIDO' }) as never);

    const incidenciaResuelta = makeIncidenciaRecord({
      tipo: TipoIncidencia.ENTREGA_FALLIDA,
      estado: EstadoIncidencia.RESUELTA,
    });
    const envioReactivado = { ...makeEnvioConDetalle({ estado: 'EN_RUTA' }) };
    incidenciaRepo.resolverConReactivacionEnvio.mockResolvedValue({
      incidencia: incidenciaResuelta,
      envio: envioReactivado as never,
    });

    notifService.notificar.mockResolvedValue({
      id: 'notif-1',
      tipo: 'CAMBIO_ESTADO',
      mensaje: 'Tu envío TRK-20260604-A3F9B21C fue reactivado para un nuevo intento de entrega',
      leida: false,
      envioId: 'envio-1',
      createdAt: new Date().toISOString(),
    } as never);

    const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA);

    // R1/R3: la incidencia y el envío se actualizan en una sola operación
    // transaccional del repositorio (resolverConReactivacionEnvio), no vía
    // actualizarEstado.
    expect(incidenciaRepo.resolverConReactivacionEnvio).toHaveBeenCalledWith(
      'incidencia-1',
      'envio-1',
    );
    expect(incidenciaRepo.actualizarEstado).not.toHaveBeenCalled();

    // R2: el método de repositorio (verificado en incidenciaRepository.test
    // a nivel de integración/Prisma) registra el EventoEnvio EN_RUTA con la
    // descripción de reactivación; aquí confirmamos que el servicio delega en
    // ese único método transaccional.
    expect(resultado.estado).toBe('RESUELTA');
  });

  it('R4 - debe notificar al cliente dueño del envío con tipo CAMBIO_ESTADO mencionando el código de seguimiento y la reactivación', async () => {
    const { service, incidenciaRepo, envioRepo, notifService } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.ABIERTA }),
    );
    envioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: 'FALLIDO' }) as never);
    incidenciaRepo.resolverConReactivacionEnvio.mockResolvedValue({
      incidencia: makeIncidenciaRecord({
        tipo: TipoIncidencia.ENTREGA_FALLIDA,
        estado: EstadoIncidencia.RESUELTA,
      }),
      envio: makeEnvioConDetalle({ estado: 'EN_RUTA' }) as never,
    });
    notifService.notificar.mockResolvedValue({
      id: 'notif-1',
      tipo: 'CAMBIO_ESTADO',
      mensaje: 'Tu envío TRK-20260604-A3F9B21C fue reactivado para un nuevo intento de entrega',
      leida: false,
      envioId: 'envio-1',
      createdAt: new Date().toISOString(),
    } as never);

    await service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA);

    expect(notifService.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'user-cliente-1',
        envioId: 'envio-1',
        mensaje: expect.stringContaining('TRK-20260604-A3F9B21C'),
        tipo: 'CAMBIO_ESTADO',
      }),
    );
    const mensaje = notifService.notificar.mock.calls[0][0].mensaje;
    expect(mensaje.toLowerCase()).toContain('reactiv');
  });

  it('R5 - al resolver una incidencia cuyo tipo no es ENTREGA_FALLIDA, debe actualizar solo la incidencia y NO modificar el envío ni notificar', async () => {
    const { service, incidenciaRepo, envioRepo, notifService } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.CLIENTE_AUSENTE, estado: EstadoIncidencia.ABIERTA }),
    );
    incidenciaRepo.actualizarEstado.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.CLIENTE_AUSENTE, estado: EstadoIncidencia.RESUELTA }),
    );

    const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA);

    expect(incidenciaRepo.actualizarEstado).toHaveBeenCalledWith(
      'incidencia-1',
      EstadoIncidencia.RESUELTA,
    );
    expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
    expect(envioRepo.findById).not.toHaveBeenCalled();
    expect(notifService.notificar).not.toHaveBeenCalled();
    expect(resultado.estado).toBe('RESUELTA');
  });

  it('R6 - al resolver una incidencia ENTREGA_FALLIDA cuyo envío asociado NO está en estado FALLIDO, debe actualizar solo la incidencia y NO modificar el envío ni notificar', async () => {
    const { service, incidenciaRepo, envioRepo, notifService } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.ABIERTA }),
    );
    envioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: 'EN_RUTA' }) as never);
    incidenciaRepo.actualizarEstado.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.RESUELTA }),
    );

    const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA);

    expect(envioRepo.findById).toHaveBeenCalledWith('envio-1');
    expect(incidenciaRepo.actualizarEstado).toHaveBeenCalledWith(
      'incidencia-1',
      EstadoIncidencia.RESUELTA,
    );
    expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
    expect(notifService.notificar).not.toHaveBeenCalled();
    expect(resultado.estado).toBe('RESUELTA');
  });

  it('R6 - al resolver una incidencia ENTREGA_FALLIDA cuyo envío asociado ya está ENTREGADO, debe actualizar solo la incidencia y NO modificar el envío', async () => {
    const { service, incidenciaRepo, envioRepo, notifService } = loadServiceWithMockedRepos();

    incidenciaRepo.findById.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.EN_PROCESO }),
    );
    envioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: 'ENTREGADO' }) as never);
    incidenciaRepo.actualizarEstado.mockResolvedValue(
      makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.RESUELTA }),
    );

    const resultado = await service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA);

    expect(incidenciaRepo.actualizarEstado).toHaveBeenCalledWith(
      'incidencia-1',
      EstadoIncidencia.RESUELTA,
    );
    expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
    expect(notifService.notificar).not.toHaveBeenCalled();
    expect(resultado.estado).toBe('RESUELTA');
  });

  describe('R7 - regresión: validaciones existentes (404/409) se preservan independientemente del tipo de incidencia o estado del envío', () => {
    it('rechaza con 404 INCIDENCIA_NOT_FOUND para una incidencia ENTREGA_FALLIDA inexistente', async () => {
      const { service, incidenciaRepo, envioRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(null);

      await expect(
        service.actualizarEstado('inexistente', EstadoIncidencia.RESUELTA),
      ).rejects.toMatchObject({ error: 'INCIDENCIA_NOT_FOUND', statusCode: 404 });
      expect(envioRepo.findById).not.toHaveBeenCalled();
      expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
    });

    it('rechaza con 409 INVALID_STATE_TRANSITION al repetir el mismo estado para una incidencia ENTREGA_FALLIDA con envío FALLIDO', async () => {
      const { service, incidenciaRepo, envioRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(
        makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.RESUELTA }),
      );

      await expect(
        service.actualizarEstado('incidencia-1', EstadoIncidencia.RESUELTA),
      ).rejects.toMatchObject({ error: 'INVALID_STATE_TRANSITION', statusCode: 409 });
      expect(envioRepo.findById).not.toHaveBeenCalled();
      expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
    });

    it('rechaza con 409 INVALID_STATE_TRANSITION al intentar reabrir una incidencia ENTREGA_FALLIDA RESUELTA, sin tocar el envío', async () => {
      const { service, incidenciaRepo, envioRepo } = loadServiceWithMockedRepos();

      incidenciaRepo.findById.mockResolvedValue(
        makeIncidenciaRecord({ tipo: TipoIncidencia.ENTREGA_FALLIDA, estado: EstadoIncidencia.RESUELTA }),
      );

      await expect(
        service.actualizarEstado('incidencia-1', EstadoIncidencia.EN_PROCESO),
      ).rejects.toMatchObject({ error: 'INVALID_STATE_TRANSITION', statusCode: 409 });
      expect(envioRepo.findById).not.toHaveBeenCalled();
      expect(incidenciaRepo.resolverConReactivacionEnvio).not.toHaveBeenCalled();
      expect(incidenciaRepo.actualizarEstado).not.toHaveBeenCalled();
    });
  });
});
