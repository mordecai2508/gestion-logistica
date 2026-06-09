import { reportesService } from '../services/reportesService';
import { reportesRepository } from '../repositories/reportesRepository';

jest.mock('../repositories/reportesRepository');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { groupBy: jest.fn(), findMany: jest.fn() },
      repartidor: { findMany: jest.fn() },
    })),
  };
});

const mockedRepo = reportesRepository as jest.Mocked<typeof reportesRepository>;

afterEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getEnviosReport — agrupa correctamente porDia y calcula totalPeriodo
// ══════════════════════════════════════════════════════════════════════════════

describe('reportesService.getEnviosReport', () => {
  it('R1 — agrupa correctamente porDia y calcula totalPeriodo', async () => {
    mockedRepo.getEnviosPorEstado.mockResolvedValue([
      { estado: 'ENTREGADO', _count: { _all: 3 } },
      { estado: 'PENDIENTE', _count: { _all: 2 } },
    ]);
    mockedRepo.getEnviosFechas.mockResolvedValue([
      { createdAt: new Date('2026-06-01T10:00:00.000Z') },
      { createdAt: new Date('2026-06-01T12:00:00.000Z') },
      { createdAt: new Date('2026-06-02T08:00:00.000Z') },
      { createdAt: new Date('2026-06-02T14:00:00.000Z') },
      { createdAt: new Date('2026-06-02T16:00:00.000Z') },
    ]);

    const result = await reportesService.getEnviosReport({
      desde: '2026-06-01',
      hasta: '2026-06-02',
    });

    expect(result.totalPeriodo).toBe(5);
    expect(result.porEstado).toEqual(
      expect.arrayContaining([
        { estado: 'ENTREGADO', total: 3 },
        { estado: 'PENDIENTE', total: 2 },
      ]),
    );
    const dia1 = result.porDia.find((d) => d.fecha === '2026-06-01');
    const dia2 = result.porDia.find((d) => d.fecha === '2026-06-02');
    expect(dia1?.total).toBe(2);
    expect(dia2?.total).toBe(3);
  });

  it('R3 — lanza error 422 si desde > hasta', async () => {
    await expect(
      reportesService.getEnviosReport({ desde: '2026-06-08', hasta: '2026-06-01' }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockedRepo.getEnviosPorEstado).not.toHaveBeenCalled();
    expect(mockedRepo.getEnviosFechas).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// exportEnviosCSV — produce CSV con cabecera correcta y filas
// ══════════════════════════════════════════════════════════════════════════════

describe('reportesService.exportEnviosCSV', () => {
  it('R5 — produce CSV con cabecera correcta y filas', async () => {
    mockedRepo.getEnviosParaCSV.mockResolvedValue([
      {
        codigoSeguimiento: 'TRK-001',
        estado: 'ENTREGADO',
        remitente: 'Juan Pérez',
        destinatario: 'María López',
        direccionDestino: 'Calle 123',
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
      },
      {
        codigoSeguimiento: 'TRK-002',
        estado: 'PENDIENTE',
        remitente: 'Pedro Sánchez',
        destinatario: 'Ana García',
        direccionDestino: 'Avenida 456',
        createdAt: new Date('2026-06-02T12:00:00.000Z'),
      },
    ]);

    const csv = await reportesService.exportEnviosCSV({
      desde: '2026-06-01',
      hasta: '2026-06-02',
    });

    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt',
    );
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('TRK-001');
    expect(lines[2]).toContain('TRK-002');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getRepartidoresRanking — ordena descendente por totalEntregados
// ══════════════════════════════════════════════════════════════════════════════

describe('reportesService.getRepartidoresRanking', () => {
  it('R8 — ordena descendente por totalEntregados', async () => {
    mockedRepo.getRepartidoresConEnvios.mockResolvedValue([
      {
        id: 'rep-2',
        usuario: { nombre: 'Ana Rodríguez' },
        rutas: [
          {
            envios: [
              { estado: 'ENTREGADO' },
              { estado: 'ENTREGADO' },
              { estado: 'FALLIDO' },
            ],
          },
        ],
      },
      {
        id: 'rep-1',
        usuario: { nombre: 'Carlos García' },
        rutas: [
          {
            envios: [
              { estado: 'ENTREGADO' },
              { estado: 'ENTREGADO' },
              { estado: 'ENTREGADO' },
              { estado: 'CANCELADO' },
            ],
          },
        ],
      },
      {
        id: 'rep-3',
        usuario: { nombre: 'Luis Martínez' },
        rutas: [],
      },
    ]);

    const result = await reportesService.getRepartidoresRanking();

    expect(result[0].id).toBe('rep-1');
    expect(result[0].totalEntregados).toBe(3);
    expect(result[0].totalFallidos).toBe(1);

    expect(result[1].id).toBe('rep-2');
    expect(result[1].totalEntregados).toBe(2);
    expect(result[1].totalFallidos).toBe(1);

    expect(result[2].id).toBe('rep-3');
    expect(result[2].totalEntregados).toBe(0);
    expect(result[2].totalFallidos).toBe(0);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].totalEntregados).toBeGreaterThanOrEqual(result[i + 1].totalEntregados);
    }
  });
});
