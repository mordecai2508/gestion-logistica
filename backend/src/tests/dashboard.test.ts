import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { dashboardService } from '../services/dashboardService';
import { Rol } from '@prisma/client';

jest.mock('../repositories/dashboardRepository');
jest.mock('../services/dashboardService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { count: jest.fn(), findMany: jest.fn() },
      incidencia: { count: jest.fn() },
      ruta: { findMany: jest.fn() },
      vehiculo: { findMany: jest.fn() },
    })),
  };
});

const mockedDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');

const METRICS_MOCK = {
  totalEnvios: 10,
  enRuta: 3,
  entregados: 5,
  incidenciasAbiertas: 2,
};

const ENVIOS_RECIENTES_MOCK = [
  {
    codigoSeguimiento: 'TRK-20260101-ABCD1234',
    clienteNombre: 'Juan Pérez',
    estado: 'EN_RUTA' as const,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const RUTAS_PENDIENTES_MOCK = [
  {
    id: 'ruta-1',
    codigo: 'RT-001',
    nombre: 'Ruta Norte',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const VEHICULOS_DISPONIBLES_MOCK = [
  {
    id: 'vehiculo-1',
    placa: 'ABC-123',
    modelo: 'Toyota Hilux',
    estado: 'DISPONIBLE' as const,
  },
];

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/metrics
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/dashboard/metrics', () => {
  it('R1/R2/R3/R4/R5 — debe devolver 200 con totalEnvios, enRuta, entregados, incidenciasAbiertas cuando el OPERADOR está autenticado', async () => {
    mockedDashboardService.getMetrics.mockResolvedValue(METRICS_MOCK);

    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(typeof res.body.data.totalEnvios).toBe('number');
    expect(typeof res.body.data.enRuta).toBe('number');
    expect(typeof res.body.data.entregados).toBe('number');
    expect(typeof res.body.data.incidenciasAbiertas).toBe('number');
    expect(res.body.data.totalEnvios).toBe(10);
    expect(res.body.data.enRuta).toBe(3);
    expect(res.body.data.entregados).toBe(5);
    expect(res.body.data.incidenciasAbiertas).toBe(2);
  });

  it('R6 — debe devolver 401 sin token de autenticación', async () => {
    const res = await request(app).get('/api/v1/dashboard/metrics');

    expect(res.status).toBe(401);
    expect(mockedDashboardService.getMetrics).not.toHaveBeenCalled();
  });

  it('R7 — debe devolver 403 cuando el usuario autenticado es CLIENTE', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getMetrics).not.toHaveBeenCalled();
  });

  it('R7 — debe devolver 403 cuando el usuario autenticado es REPARTIDOR', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getMetrics).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/envios-recientes
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/dashboard/envios-recientes', () => {
  it('R8/R9/R10 — debe devolver 200 con al menos un ítem que tenga codigoSeguimiento, clienteNombre, estado y createdAt', async () => {
    mockedDashboardService.getEnviosRecientes.mockResolvedValue(ENVIOS_RECIENTES_MOCK);

    const res = await request(app)
      .get('/api/v1/dashboard/envios-recientes')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const item = res.body.data[0];
    expect(item).toHaveProperty('codigoSeguimiento');
    expect(item).toHaveProperty('clienteNombre');
    expect(item).toHaveProperty('estado');
    expect(item).toHaveProperty('createdAt');
  });

  it('R11 — debe devolver 401 sin token', async () => {
    const res = await request(app).get('/api/v1/dashboard/envios-recientes');

    expect(res.status).toBe(401);
    expect(mockedDashboardService.getEnviosRecientes).not.toHaveBeenCalled();
  });

  it('R12 — debe devolver 403 cuando el usuario autenticado es REPARTIDOR', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/envios-recientes')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getEnviosRecientes).not.toHaveBeenCalled();
  });

  it('R12 — debe devolver 403 cuando el usuario autenticado es CLIENTE', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/envios-recientes')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getEnviosRecientes).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/rutas-pendientes
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/dashboard/rutas-pendientes', () => {
  it('R13/R14/R15 — debe devolver 200 con rutas PENDIENTE que tengan id, codigo, nombre y createdAt', async () => {
    mockedDashboardService.getRutasPendientes.mockResolvedValue(RUTAS_PENDIENTES_MOCK);

    const res = await request(app)
      .get('/api/v1/dashboard/rutas-pendientes')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const item = res.body.data[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('codigo');
    expect(item).toHaveProperty('nombre');
    expect(item).toHaveProperty('createdAt');
  });

  it('R16 — debe devolver 401 sin token', async () => {
    const res = await request(app).get('/api/v1/dashboard/rutas-pendientes');

    expect(res.status).toBe(401);
    expect(mockedDashboardService.getRutasPendientes).not.toHaveBeenCalled();
  });

  it('R17 — debe devolver 403 cuando el usuario autenticado es CLIENTE', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rutas-pendientes')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getRutasPendientes).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/vehiculos-disponibles
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/dashboard/vehiculos-disponibles', () => {
  it('R18/R19/R20 — debe devolver 200 con vehículos DISPONIBLE que tengan id, placa, modelo y estado', async () => {
    mockedDashboardService.getVehiculosDisponibles.mockResolvedValue(VEHICULOS_DISPONIBLES_MOCK);

    const res = await request(app)
      .get('/api/v1/dashboard/vehiculos-disponibles')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const item = res.body.data[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('placa');
    expect(item).toHaveProperty('modelo');
    expect(item).toHaveProperty('estado');
    expect(item.estado).toBe('DISPONIBLE');
  });

  it('R21 — debe devolver 401 sin token', async () => {
    const res = await request(app).get('/api/v1/dashboard/vehiculos-disponibles');

    expect(res.status).toBe(401);
    expect(mockedDashboardService.getVehiculosDisponibles).not.toHaveBeenCalled();
  });

  it('R22 — debe devolver 403 cuando el usuario autenticado es REPARTIDOR', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/vehiculos-disponibles')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedDashboardService.getVehiculosDisponibles).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// dashboardService — lógica de negocio (unit, real implementación + repos mockeados)
// ══════════════════════════════════════════════════════════════════════════════

type DashboardRepoMock = jest.Mocked<
  typeof import('../repositories/dashboardRepository').dashboardRepository
>;
type DashboardServiceReal = typeof import('../services/dashboardService').dashboardService;

function loadServiceWithMockedRepos(): {
  service: DashboardServiceReal;
  repo: DashboardRepoMock;
} {
  let service!: DashboardServiceReal;
  let repo!: DashboardRepoMock;

  jest.isolateModules(() => {
    jest.unmock('../services/dashboardService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repo = require('../repositories/dashboardRepository')
      .dashboardRepository as DashboardRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/dashboardService').dashboardService as DashboardServiceReal;
  });

  return { service, repo };
}

describe('dashboardService — lógica de negocio (unit, real implementación + repos mockeados)', () => {
  it('R2/R3/R4/R5 — getMetrics delega en el repositorio y devuelve las 4 métricas numéricas', async () => {
    const { service, repo } = loadServiceWithMockedRepos();
    repo.getMetrics.mockResolvedValue(METRICS_MOCK);

    const result = await service.getMetrics();

    expect(repo.getMetrics).toHaveBeenCalledTimes(1);
    expect(result).toEqual(METRICS_MOCK);
  });

  it('R10 — getEnviosRecientes aplana clienteNombre desde cliente.usuario.nombre', async () => {
    const { service, repo } = loadServiceWithMockedRepos();
    repo.getEnviosRecientes.mockResolvedValue([
      {
        codigoSeguimiento: 'TRK-20260601-ABCD1234',
        estado: 'EN_RUTA',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        cliente: { usuario: { nombre: 'María López' } },
      },
    ]);

    const result = await service.getEnviosRecientes();

    expect(result).toHaveLength(1);
    expect(result[0].clienteNombre).toBe('María López');
    expect(result[0].codigoSeguimiento).toBe('TRK-20260601-ABCD1234');
    expect(result[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('R15 — getRutasPendientes devuelve los campos id, codigo, nombre, createdAt', async () => {
    const { service, repo } = loadServiceWithMockedRepos();
    repo.getRutasPendientes.mockResolvedValue([
      { id: 'ruta-1', codigo: 'RT-001', nombre: 'Ruta Norte', createdAt: new Date('2026-06-01T00:00:00.000Z') },
    ]);

    const result = await service.getRutasPendientes();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ruta-1');
    expect(result[0].codigo).toBe('RT-001');
    expect(result[0].nombre).toBe('Ruta Norte');
    expect(result[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('R20 — getVehiculosDisponibles devuelve los campos id, placa, modelo, estado', async () => {
    const { service, repo } = loadServiceWithMockedRepos();
    repo.getVehiculosDisponibles.mockResolvedValue([
      { id: 'vehiculo-1', placa: 'ABC-123', modelo: 'Toyota Hilux', estado: 'DISPONIBLE' },
    ]);

    const result = await service.getVehiculosDisponibles();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vehiculo-1');
    expect(result[0].placa).toBe('ABC-123');
    expect(result[0].modelo).toBe('Toyota Hilux');
    expect(result[0].estado).toBe('DISPONIBLE');
  });
});
