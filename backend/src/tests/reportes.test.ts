import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { reportesService } from '../services/reportesService';
import { Rol } from '@prisma/client';

jest.mock('../repositories/reportesRepository');
jest.mock('../services/reportesService');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      repartidor: { findMany: jest.fn() },
    })),
  };
});

const mockedReportesService = reportesService as jest.Mocked<typeof reportesService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cli-1');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');

const REPORTE_ENVIOS_MOCK = {
  porEstado: [
    { estado: 'ENTREGADO', total: 5 },
    { estado: 'PENDIENTE', total: 3 },
  ],
  porDia: [
    { fecha: '2026-06-01', total: 4 },
    { fecha: '2026-06-02', total: 4 },
  ],
  totalPeriodo: 8,
};

const REPORTE_VACIO_MOCK = {
  porEstado: [],
  porDia: [],
  totalPeriodo: 0,
};

const RANKING_MOCK = [
  { id: 'rep-1', nombre: 'Carlos García', totalEntregados: 10, totalFallidos: 2 },
  { id: 'rep-2', nombre: 'Ana Rodríguez', totalEntregados: 5, totalFallidos: 1 },
  { id: 'rep-3', nombre: 'Luis Martínez', totalEntregados: 0, totalFallidos: 0 },
];

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/reportes/envios
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/reportes/envios', () => {
  it('R1 — debe devolver 200 con porEstado y porDia para OPERADOR autenticado con rango válido', async () => {
    mockedReportesService.getEnviosReport.mockResolvedValue(REPORTE_ENVIOS_MOCK);

    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2026-06-01', hasta: '2026-06-08' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(Array.isArray(res.body.data.porEstado)).toBe(true);
    expect(Array.isArray(res.body.data.porDia)).toBe(true);
    expect(typeof res.body.data.totalPeriodo).toBe('number');
  });

  it('R2 — debe devolver 422 cuando falta el parámetro desde', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ hasta: '2026-06-08' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
    expect(mockedReportesService.getEnviosReport).not.toHaveBeenCalled();
  });

  it('R2 — debe devolver 422 cuando falta el parámetro hasta', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2026-06-01' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
    expect(mockedReportesService.getEnviosReport).not.toHaveBeenCalled();
  });

  it('R3 — debe devolver 422 cuando desde es mayor que hasta', async () => {
    mockedReportesService.getEnviosReport.mockRejectedValue(
      Object.assign(new Error('desde debe ser anterior o igual a hasta'), {
        statusCode: 422,
        name: 'VALIDATION_ERROR',
      }),
    );

    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2026-06-08', hasta: '2026-06-01' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
  });

  it('R4 — debe devolver 200 con arrays vacíos cuando no hay envíos en el rango', async () => {
    mockedReportesService.getEnviosReport.mockResolvedValue(REPORTE_VACIO_MOCK);

    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2020-01-01', hasta: '2020-01-02' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.porEstado).toEqual([]);
    expect(res.body.data.porDia).toEqual([]);
    expect(res.body.data.totalPeriodo).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/reportes/envios/export
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/reportes/envios/export', () => {
  it('R5 — debe devolver Content-Type text/csv y cabecera CSV cuando OPERADOR exporta rango válido', async () => {
    const csvContent =
      'codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt\nTRK-001,ENTREGADO,Juan,María,Calle 1,2026-06-01T00:00:00.000Z';
    mockedReportesService.exportEnviosCSV.mockResolvedValue(csvContent);

    const res = await request(app)
      .get('/api/v1/reportes/envios/export')
      .query({ desde: '2026-06-01', hasta: '2026-06-08' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt');
  });

  it('R6 — debe devolver 422 en export cuando falta parámetro de fecha', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/envios/export')
      .query({ desde: '2026-06-01' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(422);
    expect(mockedReportesService.exportEnviosCSV).not.toHaveBeenCalled();
  });

  it('R7 — debe devolver CSV con solo cabecera cuando no hay envíos en rango para export', async () => {
    const csvSoloCabecera =
      'codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt';
    mockedReportesService.exportEnviosCSV.mockResolvedValue(csvSoloCabecera);

    const res = await request(app)
      .get('/api/v1/reportes/envios/export')
      .query({ desde: '2020-01-01', hasta: '2020-01-02' })
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/reportes/repartidores
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/reportes/repartidores', () => {
  it('R8 — debe devolver 200 con array de RepartidorRankingDto ordenado por totalEntregados desc', async () => {
    mockedReportesService.getRepartidoresRanking.mockResolvedValue(RANKING_MOCK);

    const res = await request(app)
      .get('/api/v1/reportes/repartidores')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].totalEntregados).toBeGreaterThanOrEqual(
      res.body.data[1].totalEntregados,
    );
    const item = res.body.data[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('nombre');
    expect(item).toHaveProperty('totalEntregados');
    expect(item).toHaveProperty('totalFallidos');
  });

  it('R9 — debe incluir repartidores con cero entregas en el ranking', async () => {
    mockedReportesService.getRepartidoresRanking.mockResolvedValue(RANKING_MOCK);

    const res = await request(app)
      .get('/api/v1/reportes/repartidores')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    const ceroEntregas = (
      res.body.data as Array<{ totalEntregados: number; totalFallidos: number }>
    ).find((r) => r.totalEntregados === 0);
    expect(ceroEntregas).toBeDefined();
    expect(ceroEntregas?.totalFallidos).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Auth / Auth guards
// ══════════════════════════════════════════════════════════════════════════════

describe('Autenticación y autorización — reportes', () => {
  it('R10 — debe devolver 401 sin token en GET /api/v1/reportes/envios', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2026-06-01', hasta: '2026-06-08' });

    expect(res.status).toBe(401);
    expect(mockedReportesService.getEnviosReport).not.toHaveBeenCalled();
  });

  it('R11 — debe devolver 403 con token CLIENTE en GET /api/v1/reportes/envios', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/envios')
      .query({ desde: '2026-06-01', hasta: '2026-06-08' })
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedReportesService.getEnviosReport).not.toHaveBeenCalled();
  });

  it('R11 — debe devolver 403 con token REPARTIDOR en GET /api/v1/reportes/repartidores', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/repartidores')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(mockedReportesService.getRepartidoresRanking).not.toHaveBeenCalled();
  });
});
