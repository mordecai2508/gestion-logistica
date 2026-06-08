import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { rutaService } from '../services/rutaService';
import { Rol, EstadoRuta, EstadoVehiculo, EstadoEnvio } from '@prisma/client';

jest.mock('../repositories/rutaRepository');
jest.mock('../services/rutaService');
jest.mock('../services/notificacionService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      vehiculo: { findUnique: jest.fn(), update: jest.fn() },
      repartidor: { findUnique: jest.fn(), findFirst: jest.fn() },
      ruta: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      notificacion: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      usuario: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedRutaService = rutaService as jest.Mocked<typeof rutaService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-op-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeVehiculo(overrides: Partial<{
  id: string; placa: string; modelo: string; capacidad: number;
  estado: EstadoVehiculo; createdAt: Date; updatedAt: Date;
}> = {}) {
  return {
    id: 'vehiculo-1', placa: 'ABC-123', modelo: 'Toyota Hilux',
    capacidad: 1000, estado: EstadoVehiculo.DISPONIBLE,
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

function makeRepartidor(overrides: Partial<{
  id: string; usuarioId: string; licencia: string | null; disponible: boolean;
}> = {}) {
  return {
    id: 'repartidor-1', usuarioId: 'user-rep-1', licencia: 'LIC-001', disponible: true,
    usuario: {
      id: 'user-rep-1', nombre: 'Carlos Repartidor', correo: 'repartidor@test.com',
      password: 'hashed', telefono: null, rol: 'REPARTIDOR' as const,
      createdAt: new Date(), updatedAt: new Date(),
    },
    ...overrides,
  };
}

function makeEnvio(overrides: Partial<{
  id: string; codigoSeguimiento: string; estado: EstadoEnvio;
  rutaId: string | null; lat: number | null; lng: number | null;
}> = {}) {
  return {
    id: 'envio-1', codigoSeguimiento: 'TRK-20260605-AAAABBBB',
    remitente: 'Juan Pérez', destinatario: 'María López',
    direccionDestino: 'Calle 123, Bogotá', peso: 2.5, dimensiones: '30x20x15',
    descripcion: null, estado: EstadoEnvio.PENDIENTE, clienteId: 'cliente-1',
    rutaId: null, lat: null, lng: null,
    evidenciaFoto: null, firma: null, fechaReprogramacion: null,
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

function makeRutaDto(overrides: Partial<{
  id: string; codigo: string; estado: EstadoRuta; repartidorId: string;
  vehiculoId: string; envios: ReturnType<typeof makeEnvio>[];
  vehiculo: ReturnType<typeof makeVehiculo>;
  repartidor: ReturnType<typeof makeRepartidor>;
}> = {}) {
  const vehiculo = overrides.vehiculo ?? makeVehiculo({ estado: EstadoVehiculo.EN_RUTA });
  const repartidor = overrides.repartidor ?? makeRepartidor();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { envios: _omitEnvios, vehiculo: _omitVehiculo, repartidor: _omitRepartidor, ...rest } = overrides;
  const envios = overrides.envios ?? [makeEnvio({ estado: EstadoEnvio.EN_RUTA })];
  return {
    id: 'ruta-1', codigo: 'RUTA-20260605-ABCD', nombre: null,
    estado: EstadoRuta.PENDIENTE, repartidorId: 'repartidor-1', vehiculoId: 'vehiculo-1',
    createdAt: new Date(), updatedAt: new Date(),
    vehiculo, repartidor, envios, ...rest,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// HTTP endpoint tests (T8)
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/rutas — Creación de ruta', () => {
  const validPayload = {
    enviosIds: ['clhqzv2k10000qwer5678abcd'],
    vehiculoId: 'clhqzv2k10001qwer5678abcd',
    repartidorId: 'clhqzv2k10002qwer5678abcd',
  };

  it('R1 — debe crear ruta con envíos, vehículo y repartidor válidos y devolver 201', async () => {
    mockedRutaService.crear.mockResolvedValue(makeRutaDto());

    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.status).toBe(201);
  });

  it('R2 — debe rechazar creación sin envíos con 422', async () => {
    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ enviosIds: [], vehiculoId: 'clhqzv2k10001qwer5678abcd', repartidorId: 'clhqzv2k10002qwer5678abcd' });

    expect(res.status).toBe(422);
  });

  it('R3 — debe rechazar creación con vehículo no disponible con 422', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.crear.mockRejectedValue(new AppError('VEHICULO_NOT_AVAILABLE', 'El vehículo no está disponible', 422));

    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VEHICULO_NOT_AVAILABLE');
  });

  it('R4 — debe rechazar creación con repartidor no disponible con 422', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.crear.mockRejectedValue(new AppError('REPARTIDOR_NOT_AVAILABLE', 'El repartidor no está disponible', 422));

    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REPARTIDOR_NOT_AVAILABLE');
  });

  it('R5 — debe rechazar envío que no está en PENDIENTE con 422', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.crear.mockRejectedValue(new AppError('ENVIO_INVALID_STATE', 'El envío no está en PENDIENTE', 422));

    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('ENVIO_INVALID_STATE');
  });

  it('R6 — debe rechazar envío ya asignado a otra ruta con 422', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.crear.mockRejectedValue(new AppError('ENVIO_ALREADY_ASSIGNED', 'El envío ya está asignado', 422));

    const res = await request(app)
      .post('/api/v1/rutas')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('ENVIO_ALREADY_ASSIGNED');
  });
});

describe('GET /api/v1/rutas — Consulta de rutas', () => {
  it('R9 + R10 — debe listar rutas paginadas con metadata', async () => {
    mockedRutaService.listar.mockResolvedValue({
      data: [makeRutaDto()],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/rutas?page=1&limit=10')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBe(1);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(10);
    expect(res.body.meta.totalPages).toBe(1);
  });

  it('R11 — debe devolver solo rutas del repartidor autenticado con repartidorId=me', async () => {
    mockedRutaService.listar.mockResolvedValue({
      data: [makeRutaDto({ repartidorId: 'repartidor-1' })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/rutas')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(mockedRutaService.listar).toHaveBeenCalledWith(
      expect.any(Object),
      'user-rep-1',
      'REPARTIDOR',
    );
  });

  it('R12 — debe rechazar listado sin autenticación con 401', async () => {
    const res = await request(app).get('/api/v1/rutas');
    expect(res.status).toBe(401);
  });

  it('R13 — debe rechazar acceso con rol CLIENTE con 403', async () => {
    const res = await request(app)
      .get('/api/v1/rutas')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/rutas/:id — Reasignación de ruta', () => {
  it('R14 + R15 — debe reasignar repartidor y vehículo válidos y devolver 200', async () => {
    const rutaActualizada = makeRutaDto({
      repartidorId: 'clhqzv2k10002qwer5678abcd',
      vehiculoId: 'clhqzv2k10001qwer5678abcd',
    });
    mockedRutaService.reasignar.mockResolvedValue(rutaActualizada);

    const res = await request(app)
      .patch('/api/v1/rutas/ruta-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ repartidorId: 'clhqzv2k10002qwer5678abcd', vehiculoId: 'clhqzv2k10001qwer5678abcd' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('R17 — debe devolver 404 si el nuevo repartidor o vehículo no existe', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.reasignar.mockRejectedValue(new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404));

    const res = await request(app)
      .patch('/api/v1/rutas/ruta-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ repartidorId: 'clhqzv2k10002qwer5678abcd' });

    expect(res.status).toBe(404);
  });

  it('R18 — debe rechazar reasignación en ruta COMPLETADA con 422', async () => {
    const { AppError } = await import('../lib/appError');
    mockedRutaService.reasignar.mockRejectedValue(new AppError('RUTA_INVALID_STATE', 'Ruta completada', 422));

    const res = await request(app)
      .patch('/api/v1/rutas/ruta-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ repartidorId: 'clhqzv2k10002qwer5678abcd' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('RUTA_INVALID_STATE');
  });
});

describe('GET /api/v1/rutas/:id/optima — Ruta óptima', () => {
  it('R19 — debe ordenar paradas por vecino más cercano', async () => {
    mockedRutaService.calcularOptima.mockResolvedValue({
      paradas: [
        { orden: 1, envioId: 'e1', codigoSeguimiento: 'TRK-1', direccionDestino: 'Dir 1', lat: 4.6, lng: -74.0 },
        { orden: 2, envioId: 'e2', codigoSeguimiento: 'TRK-2', direccionDestino: 'Dir 2', lat: 4.7, lng: -74.1 },
        { orden: 3, envioId: 'e3', codigoSeguimiento: 'TRK-3', direccionDestino: 'Dir 3', lat: 10.0, lng: -75.5 },
      ],
    });

    const res = await request(app)
      .get('/api/v1/rutas/ruta-1/optima')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.paradas).toHaveLength(3);
    expect(res.body.data.paradas[0].envioId).toBe('e1');
    expect(res.body.data.paradas[0].orden).toBe(1);
    expect(res.body.data.paradas[1].orden).toBe(2);
    expect(res.body.data.paradas[2].orden).toBe(3);
  });

  it('R20 — debe devolver la única parada sin reordenar si solo hay un envío', async () => {
    mockedRutaService.calcularOptima.mockResolvedValue({
      paradas: [{ orden: 1, envioId: 'e1', codigoSeguimiento: 'TRK-1', direccionDestino: 'Dir 1', lat: 4.6, lng: -74.0 }],
    });

    const res = await request(app)
      .get('/api/v1/rutas/ruta-1/optima')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.paradas).toHaveLength(1);
    expect(res.body.data.paradas[0].envioId).toBe('e1');
    expect(res.body.data.advertencia).toBeUndefined();
  });

  it('R21 — debe devolver advertencia si algún envío no tiene coordenadas', async () => {
    mockedRutaService.calcularOptima.mockResolvedValue({
      paradas: [
        { orden: 1, envioId: 'e1', codigoSeguimiento: 'TRK-1', direccionDestino: 'Dir 1' },
        { orden: 2, envioId: 'e2', codigoSeguimiento: 'TRK-2', direccionDestino: 'Dir 2' },
      ],
      advertencia: 'Las coordenadas de uno o más envíos no están disponibles.',
    });

    const res = await request(app)
      .get('/api/v1/rutas/ruta-1/optima')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.advertencia).toBeDefined();
    expect(typeof res.body.data.advertencia).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Service unit tests (R7, R8, R16, R22, R23)
// These tests load the REAL rutaService (bypassing the top-level
// `jest.mock('../services/rutaService')`) inside an isolated module registry,
// together with a freshly auto-mocked `rutaRepository`, so we can assert that
// the service orchestrates the repository with the expected state-transition
// payloads — real behavior, not structural placeholders.
// ══════════════════════════════════════════════════════════════════════════════

type RutaRepoMock = jest.Mocked<typeof import('../repositories/rutaRepository').rutaRepository>;
type RutaServiceReal = typeof import('../services/rutaService').rutaService;

/**
 * Loads a fresh, isolated copy of `rutaService` (its real implementation,
 * unaffected by the top-level `jest.mock`) together with the auto-mocked
 * `rutaRepository` instance it will actually call into.
 */
function loadServiceWithMockedRepo(): { service: RutaServiceReal; repo: RutaRepoMock } {
  let service!: RutaServiceReal;
  let repo!: RutaRepoMock;

  jest.isolateModules(() => {
    jest.unmock('../services/rutaService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repo = require('../repositories/rutaRepository').rutaRepository as RutaRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/rutaService').rutaService as RutaServiceReal;
  });

  return { service, repo };
}

describe('rutaService — lógica de negocio (unit, real implementación + repo mockeado)', () => {
  const enviosIds = ['envio-a', 'envio-b'];
  const validDto = {
    enviosIds,
    vehiculoId: 'vehiculo-1',
    repartidorId: 'repartidor-1',
  };

  it('R7 — debe actualizar estado del vehículo a EN_RUTA al crear ruta', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const enviosPendientes = enviosIds.map((id) => makeEnvio({ id, estado: EstadoEnvio.PENDIENTE, rutaId: null }));
    const vehiculoDisponible = makeVehiculo({ estado: EstadoVehiculo.DISPONIBLE });
    const repartidorDisponible = makeRepartidor({ disponible: true });
    const rutaCreada = makeRutaDto({
      vehiculo: makeVehiculo({ estado: EstadoVehiculo.EN_RUTA }),
      envios: enviosPendientes.map((e) => ({ ...e, estado: EstadoEnvio.EN_RUTA, rutaId: 'ruta-nueva' })),
    });

    repo.findEnviosByIds.mockResolvedValue(enviosPendientes);
    repo.findVehiculoById.mockResolvedValue(vehiculoDisponible);
    repo.findRepartidorById.mockResolvedValue(repartidorDisponible);
    repo.findByCodigo.mockResolvedValue(null);
    repo.crearConTransaccion.mockResolvedValue(rutaCreada);

    const resultado = await service.crear(validDto);

    // The service must delegate the whole creation (including the vehicle
    // status transition to EN_RUTA) to the repository's transactional method.
    expect(repo.crearConTransaccion).toHaveBeenCalledWith(
      expect.objectContaining({
        vehiculoId: 'vehiculo-1',
        repartidorId: 'repartidor-1',
        enviosIds,
      }),
    );
    // And the resulting DTO reflects the vehicle now being EN_RUTA.
    expect(resultado.vehiculo.estado).toBe('EN_RUTA');
  });

  it('R8 — debe actualizar estado de los envíos a EN_RUTA al crear ruta', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const enviosPendientes = enviosIds.map((id) => makeEnvio({ id, estado: EstadoEnvio.PENDIENTE, rutaId: null }));
    const enviosEnRuta = enviosPendientes.map((e) => ({ ...e, estado: EstadoEnvio.EN_RUTA, rutaId: 'ruta-nueva' }));
    const rutaCreada = makeRutaDto({ envios: enviosEnRuta });

    repo.findEnviosByIds.mockResolvedValue(enviosPendientes);
    repo.findVehiculoById.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.DISPONIBLE }));
    repo.findRepartidorById.mockResolvedValue(makeRepartidor({ disponible: true }));
    repo.findByCodigo.mockResolvedValue(null);
    repo.crearConTransaccion.mockResolvedValue(rutaCreada);

    const resultado = await service.crear(validDto);

    // The service must ask the repository to assign exactly these shipment
    // ids as part of the atomic creation (which sets their estado to EN_RUTA).
    expect(repo.crearConTransaccion).toHaveBeenCalledWith(
      expect.objectContaining({ enviosIds }),
    );
    expect(resultado.envios.every((e) => e.estado === 'EN_RUTA')).toBe(true);
  });

  it('R16 — debe revertir vehículo anterior a DISPONIBLE al reasignar', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const rutaExistente = makeRutaDto({
      estado: EstadoRuta.PENDIENTE,
      vehiculoId: 'vehiculo-anterior',
    });
    const nuevoVehiculo = makeVehiculo({ id: 'vehiculo-nuevo', estado: EstadoVehiculo.DISPONIBLE });
    const rutaReasignada = makeRutaDto({
      vehiculoId: 'vehiculo-nuevo',
      vehiculo: makeVehiculo({ id: 'vehiculo-nuevo', estado: EstadoVehiculo.EN_RUTA }),
    });

    repo.findById.mockResolvedValue(rutaExistente);
    repo.findVehiculoById.mockResolvedValue(nuevoVehiculo);
    repo.reasignarConTransaccion.mockResolvedValue(rutaReasignada);

    const resultado = await service.reasignar('ruta-1', { vehiculoId: 'vehiculo-nuevo' });

    // The service must instruct the repository to revert the *previous*
    // vehicle (vehiculoAnteriorId) back to DISPONIBLE while assigning the new one.
    expect(repo.reasignarConTransaccion).toHaveBeenCalledWith(
      expect.objectContaining({
        rutaId: 'ruta-1',
        vehiculoId: 'vehiculo-nuevo',
        vehiculoAnteriorId: 'vehiculo-anterior',
      }),
    );
    expect(resultado.vehiculo.id).toBe('vehiculo-nuevo');
    expect(resultado.vehiculo.estado).toBe('EN_RUTA');
  });

  it('R22 — debe marcar ruta como COMPLETADA cuando todos los envíos son terminales', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const envioEntregado = makeEnvio({ id: 'e1', estado: EstadoEnvio.ENTREGADO });
    const envioCancelado = makeEnvio({ id: 'e2', estado: EstadoEnvio.CANCELADO });
    const ruta = makeRutaDto({
      id: 'ruta-cierre',
      estado: EstadoRuta.PENDIENTE,
      vehiculoId: 'vehiculo-9',
      envios: [envioEntregado, envioCancelado],
    });

    repo.findById.mockResolvedValue(ruta);
    repo.cerrarRutaConTransaccion.mockResolvedValue(undefined);

    await service.verificarCierreRuta('ruta-cierre');

    // When every shipment of the route reached a terminal state, the service
    // must close the route (estado -> COMPLETADA) via the repository.
    expect(repo.cerrarRutaConTransaccion).toHaveBeenCalledWith('ruta-cierre', 'vehiculo-9');
  });

  it('R23 — debe marcar vehículo como DISPONIBLE al completar la ruta', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const ruta = makeRutaDto({
      id: 'ruta-cierre-2',
      estado: EstadoRuta.PENDIENTE,
      vehiculoId: 'vehiculo-disponible-luego',
      envios: [
        makeEnvio({ id: 'e1', estado: EstadoEnvio.ENTREGADO }),
        makeEnvio({ id: 'e2', estado: EstadoEnvio.ENTREGADO }),
      ],
    });

    repo.findById.mockResolvedValue(ruta);
    repo.cerrarRutaConTransaccion.mockResolvedValue(undefined);

    await service.verificarCierreRuta('ruta-cierre-2');

    // The repository call that closes the route is the same one responsible
    // for releasing the vehicle back to DISPONIBLE (cerrarRutaConTransaccion
    // performs both updates atomically) — assert it receives the route's vehicle id.
    expect(repo.cerrarRutaConTransaccion).toHaveBeenCalledTimes(1);
    expect(repo.cerrarRutaConTransaccion).toHaveBeenCalledWith('ruta-cierre-2', 'vehiculo-disponible-luego');
  });

  it('verificarCierreRuta — NO cierra la ruta si algún envío sigue sin estado terminal', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const ruta = makeRutaDto({
      id: 'ruta-en-curso',
      estado: EstadoRuta.PENDIENTE,
      vehiculoId: 'vehiculo-9',
      envios: [
        makeEnvio({ id: 'e1', estado: EstadoEnvio.ENTREGADO }),
        makeEnvio({ id: 'e2', estado: EstadoEnvio.EN_RUTA }),
      ],
    });

    repo.findById.mockResolvedValue(ruta);

    await service.verificarCierreRuta('ruta-en-curso');

    expect(repo.cerrarRutaConTransaccion).not.toHaveBeenCalled();
  });
});
