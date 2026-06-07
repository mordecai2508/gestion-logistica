import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { vehiculoService } from '../services/vehiculoService';
import { Rol, EstadoVehiculo } from '@prisma/client';
import { AppError } from '../lib/appError';

jest.mock('../repositories/vehiculoRepository');
jest.mock('../services/vehiculoService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      vehiculo: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    })),
  };
});

const mockedVehiculoService = vehiculoService as jest.Mocked<typeof vehiculoService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-op-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');

function makeVehiculoDto(overrides: Partial<{
  id: string; placa: string; modelo: string; capacidad: number;
  estado: EstadoVehiculo; createdAt: Date; updatedAt: Date;
}> = {}) {
  return {
    id: 'vehiculo-1',
    placa: 'ABC-123',
    modelo: 'Toyota Hilux',
    capacidad: 1000,
    estado: EstadoVehiculo.DISPONIBLE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/vehiculos — Registro de vehículo
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/vehiculos — Registro de vehículo', () => {
  const validPayload = { placa: 'ABC-123', modelo: 'Toyota Hilux', capacidad: 1000 };

  it('R1 — debe registrar un vehículo válido con estado DISPONIBLE y devolver 201', async () => {
    mockedVehiculoService.crear.mockResolvedValue(makeVehiculoDto());

    const res = await request(app)
      .post('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.estado).toBe('DISPONIBLE');
    expect(mockedVehiculoService.crear).toHaveBeenCalledWith(validPayload);
  });

  it('R2 — debe rechazar el registro con placa duplicada y devolver 409', async () => {
    mockedVehiculoService.crear.mockRejectedValue(
      new AppError('PLACA_DUPLICADA', 'La placa ya está registrada', 409),
    );

    const res = await request(app)
      .post('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('PLACA_DUPLICADA');
  });

  it('R3 — debe rechazar el registro con campos inválidos o capacidad no positiva con 422', async () => {
    const res = await request(app)
      .post('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ placa: '', modelo: 'Toyota Hilux', capacidad: -5 });

    expect(res.status).toBe(422);
    expect(mockedVehiculoService.crear).not.toHaveBeenCalled();
  });

  it('R4 — debe rechazar el registro de un usuario sin rol OPERADOR con 403', async () => {
    const res = await request(app)
      .post('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(mockedVehiculoService.crear).not.toHaveBeenCalled();
  });

  it('R5 — debe rechazar el registro sin autenticación con 401', async () => {
    const res = await request(app)
      .post('/api/v1/vehiculos')
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(mockedVehiculoService.crear).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/vehiculos — Consulta y disponibilidad de vehículos
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/vehiculos — Consulta de vehículos', () => {
  it('R6 — debe listar vehículos con placa, modelo, capacidad y estado', async () => {
    mockedVehiculoService.listar.mockResolvedValue([makeVehiculoDto()]);

    const res = await request(app)
      .get('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      placa: 'ABC-123',
      modelo: 'Toyota Hilux',
      capacidad: 1000,
      estado: 'DISPONIBLE',
    });
    expect(mockedVehiculoService.listar).toHaveBeenCalledWith({});
  });

  it('R7 — debe filtrar vehículos por estado cuando se recibe ?estado', async () => {
    mockedVehiculoService.listar.mockResolvedValue([
      makeVehiculoDto({ id: 'vehiculo-2', placa: 'XYZ-789', estado: EstadoVehiculo.MANTENIMIENTO }),
    ]);

    const res = await request(app)
      .get('/api/v1/vehiculos?estado=MANTENIMIENTO')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].estado).toBe('MANTENIMIENTO');
    expect(mockedVehiculoService.listar).toHaveBeenCalledWith({ estado: 'MANTENIMIENTO' });
  });

  it('R8 — debe rechazar el listado con un valor de estado inválido en el filtro con 422', async () => {
    const res = await request(app)
      .get('/api/v1/vehiculos?estado=INVALIDO')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
    expect(mockedVehiculoService.listar).not.toHaveBeenCalled();
  });

  it('R9 — debe rechazar el listado sin autenticación con 401', async () => {
    const res = await request(app).get('/api/v1/vehiculos');

    expect(res.status).toBe(401);
    expect(mockedVehiculoService.listar).not.toHaveBeenCalled();
  });

  it('R10 — debe rechazar el listado para un usuario con rol CLIENTE con 403', async () => {
    const res = await request(app)
      .get('/api/v1/vehiculos')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(mockedVehiculoService.listar).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/vehiculos/:id — Actualización de estado
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/v1/vehiculos/:id — Actualización de estado', () => {
  it('R11 — debe actualizar el estado de un vehículo existente y devolver 200', async () => {
    mockedVehiculoService.actualizarEstado.mockResolvedValue(
      makeVehiculoDto({ estado: EstadoVehiculo.MANTENIMIENTO }),
    );

    const res = await request(app)
      .patch('/api/v1/vehiculos/vehiculo-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: 'MANTENIMIENTO' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(res.body.data.estado).toBe('MANTENIMIENTO');
    expect(mockedVehiculoService.actualizarEstado).toHaveBeenCalledWith('vehiculo-1', 'MANTENIMIENTO');
  });

  it('R12 — debe rechazar la actualización con un valor de estado inválido con 422', async () => {
    const res = await request(app)
      .patch('/api/v1/vehiculos/vehiculo-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: 'INVALIDO' });

    expect(res.status).toBe(422);
    expect(mockedVehiculoService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('R13 — debe devolver 404 al actualizar un vehículo inexistente', async () => {
    mockedVehiculoService.actualizarEstado.mockRejectedValue(
      new AppError('VEHICULO_NOT_FOUND', 'Vehículo no encontrado', 404),
    );

    const res = await request(app)
      .patch('/api/v1/vehiculos/vehiculo-inexistente')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: 'DISPONIBLE' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VEHICULO_NOT_FOUND');
  });

  it('R14 — debe rechazar el cambio de un vehículo EN_RUTA a MANTENIMIENTO o FUERA_SERVICIO con 422', async () => {
    mockedVehiculoService.actualizarEstado.mockRejectedValue(
      new AppError(
        'VEHICULO_EN_RUTA_ACTIVA',
        'El vehículo está asignado a una ruta activa; debe desvincularse de ella antes de cambiar su estado',
        422,
      ),
    );

    const res = await request(app)
      .patch('/api/v1/vehiculos/vehiculo-1')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .send({ estado: 'FUERA_SERVICIO' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VEHICULO_EN_RUTA_ACTIVA');
  });

  it('R15 — debe rechazar la actualización de estado de un usuario sin rol OPERADOR con 403', async () => {
    const res = await request(app)
      .patch('/api/v1/vehiculos/vehiculo-1')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .send({ estado: 'DISPONIBLE' });

    expect(res.status).toBe(403);
    expect(mockedVehiculoService.actualizarEstado).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Service unit tests (R1, R2, R6, R7, R11, R13, R14)
// These tests load the REAL vehiculoService (bypassing the top-level
// `jest.mock('../services/vehiculoService')`) inside an isolated module
// registry, together with a freshly auto-mocked `vehiculoRepository`, so the
// actual conditional business logic of the service — not a mocked stand-in —
// is what decides whether to throw or to delegate to the repository.
// Replicates the pattern already approved in `rutas.test.ts` (líneas ~336-368):
// `jest.isolateModules` + `jest.unmock('../services/vehiculoService')`.
// ══════════════════════════════════════════════════════════════════════════════

type VehiculoRepoMock = jest.Mocked<typeof import('../repositories/vehiculoRepository').vehiculoRepository>;
type VehiculoServiceReal = typeof import('../services/vehiculoService').vehiculoService;

/**
 * Loads a fresh, isolated copy of `vehiculoService` (its real implementation,
 * unaffected by the top-level `jest.mock`) together with the auto-mocked
 * `vehiculoRepository` instance it will actually call into.
 */
function loadServiceWithMockedRepo(): { service: VehiculoServiceReal; repo: VehiculoRepoMock } {
  let service!: VehiculoServiceReal;
  let repo!: VehiculoRepoMock;

  jest.isolateModules(() => {
    jest.unmock('../services/vehiculoService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repo = require('../repositories/vehiculoRepository').vehiculoRepository as VehiculoRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/vehiculoService').vehiculoService as VehiculoServiceReal;
  });

  return { service, repo };
}

/** Prisma-shaped `Vehiculo` (as returned by the repository), not the response DTO. */
function makeVehiculo(overrides: Partial<{
  id: string; placa: string; modelo: string; capacidad: number;
  estado: EstadoVehiculo; createdAt: Date; updatedAt: Date;
}> = {}) {
  return {
    id: 'vehiculo-1',
    placa: 'ABC-123',
    modelo: 'Toyota Hilux',
    capacidad: 1000,
    estado: EstadoVehiculo.DISPONIBLE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('vehiculoService — lógica de negocio (unit, real implementación + repo mockeado)', () => {
  const crearDto = { placa: 'ABC-123', modelo: 'Toyota Hilux', capacidad: 1000 };

  it('R1 — debe verificar placa única y crear el vehículo cuando no existe duplicado', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    const creado = makeVehiculo();
    repo.findByPlaca.mockResolvedValue(null);
    repo.crear.mockResolvedValue(creado);

    const resultado = await service.crear(crearDto);

    // The service must check for an existing plate FIRST...
    expect(repo.findByPlaca).toHaveBeenCalledWith('ABC-123');
    // ...and only then delegate the actual creation to the repository
    // (estado is not part of the payload — the schema/DB default to DISPONIBLE).
    expect(repo.crear).toHaveBeenCalledWith({
      placa: 'ABC-123',
      modelo: 'Toyota Hilux',
      capacidad: 1000,
    });
    expect(resultado.estado).toBe('DISPONIBLE');
    expect(resultado.placa).toBe('ABC-123');
  });

  it('R2 — debe lanzar PLACA_DUPLICADA (409) y NO crear cuando la placa ya existe', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findByPlaca.mockResolvedValue(makeVehiculo({ id: 'vehiculo-existente' }));

    await expect(service.crear(crearDto)).rejects.toMatchObject({
      error: 'PLACA_DUPLICADA',
      statusCode: 409,
    });
    // The duplicate must be detected BEFORE attempting to create.
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('R6 — debe listar vehículos delegando en el repositorio sin filtro y mapear al DTO', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findAll.mockResolvedValue([
      makeVehiculo({ id: 'vehiculo-1', placa: 'ABC-123' }),
      makeVehiculo({ id: 'vehiculo-2', placa: 'XYZ-789', estado: EstadoVehiculo.MANTENIMIENTO }),
    ]);

    const resultado = await service.listar({});

    expect(repo.findAll).toHaveBeenCalledWith({});
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({ placa: 'ABC-123', modelo: 'Toyota Hilux', capacidad: 1000, estado: 'DISPONIBLE' });
    expect(resultado[1]).toMatchObject({ placa: 'XYZ-789', estado: 'MANTENIMIENTO' });
  });

  it('R7 — debe reenviar el filtro de estado al repositorio y devolver solo lo que este responde', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findAll.mockResolvedValue([
      makeVehiculo({ id: 'vehiculo-2', placa: 'XYZ-789', estado: EstadoVehiculo.MANTENIMIENTO }),
    ]);

    const resultado = await service.listar({ estado: EstadoVehiculo.MANTENIMIENTO });

    // The service must pass the filter through to the repository verbatim —
    // the actual filtering is the repository's responsibility (Prisma `where`),
    // so the service is only correct if it forwards `{ estado }` as received.
    expect(repo.findAll).toHaveBeenCalledWith({ estado: 'MANTENIMIENTO' });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].estado).toBe('MANTENIMIENTO');
  });

  it('R11 — debe buscar el vehículo, delegar la actualización en el repositorio y devolver el DTO mapeado', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findById.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.DISPONIBLE }));
    repo.actualizarEstado.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.MANTENIMIENTO }));

    const resultado = await service.actualizarEstado('vehiculo-1', EstadoVehiculo.MANTENIMIENTO);

    expect(repo.findById).toHaveBeenCalledWith('vehiculo-1');
    expect(repo.actualizarEstado).toHaveBeenCalledWith('vehiculo-1', 'MANTENIMIENTO');
    expect(resultado.estado).toBe('MANTENIMIENTO');
  });

  it('R13 — debe lanzar VEHICULO_NOT_FOUND (404) y NO actualizar cuando el vehículo no existe', async () => {
    const { service, repo } = loadServiceWithMockedRepo();

    repo.findById.mockResolvedValue(null);

    await expect(service.actualizarEstado('vehiculo-inexistente', EstadoVehiculo.DISPONIBLE)).rejects.toMatchObject({
      error: 'VEHICULO_NOT_FOUND',
      statusCode: 404,
    });
    expect(repo.actualizarEstado).not.toHaveBeenCalled();
  });

  describe('R14 — bloqueo de transición de un vehículo EN_RUTA hacia MANTENIMIENTO/FUERA_SERVICIO', () => {
    it.each([EstadoVehiculo.MANTENIMIENTO, EstadoVehiculo.FUERA_SERVICIO])(
      'lanza VEHICULO_EN_RUTA_ACTIVA (422) y NO actualiza cuando el vehículo está EN_RUTA y el nuevo estado es %s',
      async (nuevoEstado) => {
        const { service, repo } = loadServiceWithMockedRepo();

        repo.findById.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.EN_RUTA }));

        await expect(service.actualizarEstado('vehiculo-1', nuevoEstado)).rejects.toMatchObject({
          error: 'VEHICULO_EN_RUTA_ACTIVA',
          statusCode: 422,
        });
        // The whole point of R14 is that the transition never reaches the repository.
        expect(repo.actualizarEstado).not.toHaveBeenCalled();
      },
    );

    it('permite la transición EN_RUTA → DISPONIBLE (no lanza y delega en el repositorio)', async () => {
      const { service, repo } = loadServiceWithMockedRepo();

      repo.findById.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.EN_RUTA }));
      repo.actualizarEstado.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.DISPONIBLE }));

      const resultado = await service.actualizarEstado('vehiculo-1', EstadoVehiculo.DISPONIBLE);

      expect(repo.actualizarEstado).toHaveBeenCalledWith('vehiculo-1', 'DISPONIBLE');
      expect(resultado.estado).toBe('DISPONIBLE');
    });

    it.each([EstadoVehiculo.MANTENIMIENTO, EstadoVehiculo.FUERA_SERVICIO])(
      'permite la transición DISPONIBLE → %s (no aplica el bloqueo de R14 fuera de EN_RUTA)',
      async (nuevoEstado) => {
        const { service, repo } = loadServiceWithMockedRepo();

        repo.findById.mockResolvedValue(makeVehiculo({ estado: EstadoVehiculo.DISPONIBLE }));
        repo.actualizarEstado.mockResolvedValue(makeVehiculo({ estado: nuevoEstado }));

        const resultado = await service.actualizarEstado('vehiculo-1', nuevoEstado);

        expect(repo.actualizarEstado).toHaveBeenCalledWith('vehiculo-1', nuevoEstado);
        expect(resultado.estado).toBe(nuevoEstado);
      },
    );
  });
});
