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
      envio: { findUnique: jest.fn(), create: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      cliente: { findUnique: jest.fn() },
      notificacion: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
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
    codigoSeguimiento: 'TRK-20260604-A3F9B21C',
    remitente: 'Juan Pérez',
    destinatario: 'María López',
    direccionDestino: 'Calle 123, Bogotá',
    peso: 2.5,
    dimensiones: '30x20x15',
    descripcion: null,
    estado: EstadoEnvio.PENDIENTE,
    clienteId: 'cliente-1',
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
    rutaId: null,
    lat: null,
    lng: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    ...overrides,
  };
}

const validPayload = {
  remitente: 'Juan Pérez',
  destinatario: 'María López',
  direccionDestino: 'Calle 123, Bogotá',
  peso: 2.5,
  dimensiones: '30x20x15',
  clienteId: 'clhqzv2k10000qwer5678abcd',
};

const mockCliente = {
  id: 'clhqzv2k10000qwer5678abcd',
  usuarioId: 'user-cliente-1',
};

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/envios — Auth & Role
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/envios — Auth & Role', () => {
  it('R1 — debe rechazar requests sin token con 401', async () => {
    const res = await request(app).post('/api/v1/envios').send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
  });

  it('R2 — debe rechazar requests de rol CLIENTE con 403', async () => {
    const token = makeToken(Rol.CLIENTE);
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('R2 — debe rechazar requests de rol REPARTIDOR con 403', async () => {
    const token = makeToken(Rol.REPARTIDOR);
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/envios — Validación (R8, R9)
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/envios — Validación', () => {
  const token = makeToken(Rol.OPERADOR);

  it('R8/R9 — debe devolver 422 cuando peso es 0', async () => {
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, peso: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R8/R9 — debe devolver 422 cuando peso es negativo', async () => {
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, peso: -1 });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R8/R9 — debe devolver 422 cuando falta remitente', async () => {
    const withoutRemitente = (({ remitente: _, ...rest }) => rest)(validPayload);
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(withoutRemitente);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R8/R9 — debe devolver 422 cuando dimensiones no tiene formato WxHxD', async () => {
    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, dimensiones: '30-20-15' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/envios — Cliente no encontrado (R10)
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/envios — Cliente no encontrado', () => {
  it('R10 — debe devolver 404 cuando clienteId no existe en la tabla Cliente', async () => {
    const token = makeToken(Rol.OPERADOR);
    mockedClienteRepo.findById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('CLIENTE_NOT_FOUND');
    expect(res.body.message).toBe('Cliente no encontrado');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/envios — Creación exitosa (R3, R4, R5, R6)
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/envios — Creación exitosa', () => {
  it('R3 — debe crear el envío con estado PENDIENTE y devolver 201 con EnvioResponseDto', async () => {
    const token = makeToken(Rol.OPERADOR);
    mockedClienteRepo.findById.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findByCodigo.mockResolvedValue(null);
    const envioRecord = makeEnvioRecord({ clienteId: validPayload.clienteId });
    mockedEnvioRepo.createEnvio.mockResolvedValue(envioRecord);

    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Envío creado exitosamente');
    expect(res.body.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: 'envio-1',
      estado: 'PENDIENTE',
      remitente: 'Juan Pérez',
      destinatario: 'María López',
    });
  });

  it('R4 — debe crear un EventoEnvio inicial con estado PENDIENTE al crear el envío', async () => {
    const token = makeToken(Rol.OPERADOR);
    mockedClienteRepo.findById.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findByCodigo.mockResolvedValue(null);
    const envioRecord = makeEnvioRecord({ clienteId: validPayload.clienteId });
    mockedEnvioRepo.createEnvio.mockResolvedValue(envioRecord);

    await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(mockedEnvioRepo.createEnvio).toHaveBeenCalledWith(
      expect.objectContaining({
        remitente: validPayload.remitente,
        destinatario: validPayload.destinatario,
        clienteId: validPayload.clienteId,
        codigoSeguimiento: expect.stringMatching(/^TRK-\d{8}-[A-F0-9]{8}$/),
      }),
    );
  });

  it('R5/R6 — el código generado debe tener formato TRK-YYYYMMDD-XXXXXXXX y ser único', async () => {
    const token = makeToken(Rol.OPERADOR);
    mockedClienteRepo.findById.mockResolvedValue(mockCliente);
    mockedEnvioRepo.findByCodigo.mockResolvedValue(null);
    const envioRecord = makeEnvioRecord({ clienteId: validPayload.clienteId });
    mockedEnvioRepo.createEnvio.mockResolvedValue(envioRecord);

    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(mockedEnvioRepo.createEnvio).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoSeguimiento: expect.stringMatching(/^TRK-\d{8}-[A-F0-9]{8}$/),
      }),
    );
    // Verificar que findByCodigo fue llamado para comprobar unicidad
    expect(mockedEnvioRepo.findByCodigo).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/envios — Colisión de código (R7)
// ──────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/envios — Colisión de código', () => {
  it('R7 — debe devolver 500 cuando hay 3 colisiones consecutivas al generar el código', async () => {
    const token = makeToken(Rol.OPERADOR);
    mockedClienteRepo.findById.mockResolvedValue(mockCliente);
    // Simular que el código siempre existe (3 colisiones)
    mockedEnvioRepo.findByCodigo.mockResolvedValue(
      makeEnvioRecord(),
    );

    const res = await request(app)
      .post('/api/v1/envios')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('CODIGO_GENERATION_FAILED');
    expect(res.body.message).toBe('No se pudo generar un código de seguimiento único');
    // Se intentó 3 veces
    expect(mockedEnvioRepo.findByCodigo).toHaveBeenCalledTimes(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// envios_consultar — listar/detalle/editar/cancelar
// ──────────────────────────────────────────────────────────────────────────────

function makeEnvioConCliente(overrides: Partial<ReturnType<typeof makeEnvioRecord>> = {}) {
  const base = makeEnvioRecord(overrides);
  return {
    ...base,
    cliente: {
      id: base.clienteId,
      usuarioId: 'user-cliente-1',
      usuario: { id: 'user-cliente-1', nombre: 'Ana García', correo: 'ana@example.com', password: 'hashed', telefono: null, rol: Rol.CLIENTE, activo: true, createdAt: new Date(), updatedAt: new Date() },
    },
  };
}

function makeEnvioConDetalle(overrides: Partial<ReturnType<typeof makeEnvioRecord>> = {}) {
  const base = makeEnvioConCliente(overrides);
  return {
    ...base,
    eventos: [
      {
        id: 'evento-1',
        envioId: base.id,
        estado: EstadoEnvio.PENDIENTE,
        descripcion: 'Envío creado',
        lat: null,
        lng: null,
        timestamp: new Date('2026-06-04T00:00:00.000Z'),
      },
    ],
  };
}

describe('envios_consultar — listar/detalle/editar/cancelar', () => {
  const operadorToken = makeToken(Rol.OPERADOR);
  const clienteToken = makeToken(Rol.CLIENTE);

  // ── Auth / Role ──────────────────────────────────────────────────────────────

  it('R1/R34 — debe rechazar GET /envios sin token con 401', async () => {
    const res = await request(app).get('/api/v1/envios');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
  });

  it('R2/R34 — debe rechazar GET /envios con token de CLIENTE con 403', async () => {
    const res = await request(app)
      .get('/api/v1/envios')
      .set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  // ── Listar paginado ──────────────────────────────────────────────────────────

  it('R3/R35 — debe devolver lista paginada con meta correcto sin filtros', async () => {
    mockedEnvioRepo.findMany.mockResolvedValue([makeEnvioConCliente()]);
    mockedEnvioRepo.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/envios')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Envíos obtenidos exitosamente');
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('R4/R35 — debe usar page=1 y limit=20 por defecto cuando no se pasan query params', async () => {
    mockedEnvioRepo.findMany.mockResolvedValue([]);
    mockedEnvioRepo.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/envios')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(20);
  });

  it('R5/R36 — debe devolver 422 cuando page=0', async () => {
    const res = await request(app)
      .get('/api/v1/envios?page=0')
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R6/R37 — debe filtrar por estado=PENDIENTE y devolver solo envíos PENDIENTE', async () => {
    const envioConCliente = makeEnvioConCliente({ estado: EstadoEnvio.PENDIENTE });
    mockedEnvioRepo.findMany.mockResolvedValue([envioConCliente]);
    mockedEnvioRepo.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/envios?estado=PENDIENTE')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].estado).toBe('PENDIENTE');
    expect(mockedEnvioRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ estado: EstadoEnvio.PENDIENTE }),
      0,
      20,
    );
  });

  it('R7/R38 — debe filtrar por cliente (nombre parcial, case-insensitive)', async () => {
    mockedEnvioRepo.findMany.mockResolvedValue([makeEnvioConCliente()]);
    mockedEnvioRepo.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/envios?cliente=ana')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(mockedEnvioRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: { usuario: { nombre: { contains: 'ana', mode: 'insensitive' } } },
      }),
      0,
      20,
    );
  });

  it('R8/R39 — debe filtrar por codigo (parcial, case-insensitive)', async () => {
    mockedEnvioRepo.findMany.mockResolvedValue([makeEnvioConCliente()]);
    mockedEnvioRepo.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/envios?codigo=TRK')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(mockedEnvioRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoSeguimiento: { contains: 'TRK', mode: 'insensitive' },
      }),
      0,
      20,
    );
  });

  it('R9/R40 — debe aplicar filtros estado y codigo simultáneamente (AND)', async () => {
    mockedEnvioRepo.findMany.mockResolvedValue([makeEnvioConCliente()]);
    mockedEnvioRepo.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/envios?estado=PENDIENTE&codigo=TRK')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(mockedEnvioRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoEnvio.PENDIENTE,
        codigoSeguimiento: { contains: 'TRK', mode: 'insensitive' },
      }),
      0,
      20,
    );
  });

  it('R10/R41 — debe devolver 422 cuando estado tiene un valor no válido', async () => {
    const res = await request(app)
      .get('/api/v1/envios?estado=INVALID')
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  // ── Detalle ──────────────────────────────────────────────────────────────────

  it('R11/R42 — debe devolver detalle completo con array eventos ordenado por timestamp', async () => {
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle());

    const res = await request(app)
      .get('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Envío obtenido exitosamente');
    expect(res.body.data.id).toBe('envio-1');
    expect(Array.isArray(res.body.data.eventos)).toBe(true);
    expect(res.body.data.eventos[0].descripcion).toBe('Envío creado');
  });

  it('R12/R43 — debe devolver 404 cuando id no existe en GET /:id', async () => {
    mockedEnvioRepo.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/envios/nonexistent-id')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
    expect(res.body.message).toBe('Envío no encontrado');
  });

  // ── Editar ───────────────────────────────────────────────────────────────────

  it('R13/R44 — debe actualizar campos editables y devolver 200 con registro actualizado', async () => {
    const updated = makeEnvioRecord({ remitente: 'Nuevo Remitente' });
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle());
    mockedEnvioRepo.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ remitente: 'Nuevo Remitente' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Envío actualizado exitosamente');
    expect(res.body.data.remitente).toBe('Nuevo Remitente');
  });

  it('R14/R45 — no debe modificar estado aunque se incluya en el body del PATCH', async () => {
    const updated = makeEnvioRecord({ estado: EstadoEnvio.PENDIENTE });
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle());
    mockedEnvioRepo.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ remitente: 'Juan Pérez', estado: 'EN_RUTA' });

    expect(res.status).toBe(200);
    expect(mockedEnvioRepo.update).toHaveBeenCalledWith(
      'envio-1',
      expect.not.objectContaining({ estado: expect.anything() }),
    );
  });

  it('R15/R46 — debe devolver 422 cuando body de PATCH no contiene campos editables', async () => {
    const res = await request(app)
      .patch('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R16/R47 — debe devolver 422 cuando peso es negativo en PATCH', async () => {
    const res = await request(app)
      .patch('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ peso: -1 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('R17 — debe devolver 404 cuando id no existe en PATCH /:id', async () => {
    mockedEnvioRepo.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/v1/envios/nonexistent-id')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ remitente: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  // ── Cancelar ─────────────────────────────────────────────────────────────────

  it('R18/R48 — debe cambiar estado a CANCELADO y devolver 200 para envío PENDIENTE', async () => {
    const cancelado = makeEnvioRecord({ estado: EstadoEnvio.CANCELADO });
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.PENDIENTE }));
    mockedEnvioRepo.cancelar.mockResolvedValue(cancelado);

    const res = await request(app)
      .delete('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Envío cancelado exitosamente');
    expect(res.body.data.estado).toBe('CANCELADO');
  });

  it('R19/R49 — debe devolver 409 al cancelar envío que no está en PENDIENTE', async () => {
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.ENTREGADO }));

    const res = await request(app)
      .delete('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_STATE_TRANSITION');
    expect(res.body.message).toBe('Solo se pueden cancelar envíos en estado PENDIENTE');
  });

  it('R20/R50 — debe devolver 404 cuando id no existe en DELETE /:id', async () => {
    mockedEnvioRepo.findById.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/envios/nonexistent-id')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  it('R21/R48 — debe crear EventoEnvio con estado CANCELADO al cancelar el envío', async () => {
    const cancelado = makeEnvioRecord({ estado: EstadoEnvio.CANCELADO });
    mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle({ estado: EstadoEnvio.PENDIENTE }));
    mockedEnvioRepo.cancelar.mockResolvedValue(cancelado);

    const res = await request(app)
      .delete('/api/v1/envios/envio-1')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(mockedEnvioRepo.cancelar).toHaveBeenCalledWith('envio-1');
  });
});
