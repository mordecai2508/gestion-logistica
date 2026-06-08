import { Readable } from 'stream';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { entregaService } from '../services/entregaService';
import { Rol } from '@prisma/client';
import type { Envio, EventoEnvio } from '@prisma/client';
import type { ConfirmarEntregaResponseDto } from '../types/entregaTypes';
import type { EnvioConRutaYCliente } from '../repositories/entregaRepository';

function makeMulterFile(
  fieldname: 'foto' | 'firma',
  mimetype: 'image/jpeg' | 'image/png',
  buffer: Buffer,
): Express.Multer.File {
  return {
    fieldname,
    originalname: `${fieldname}.${mimetype === 'image/jpeg' ? 'jpg' : 'png'}`,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: Readable.from(buffer),
    destination: '',
    filename: '',
    path: '',
  };
}

jest.mock('../services/entregaService');
jest.mock('../repositories/entregaRepository');
jest.mock('../repositories/rutaRepository');
jest.mock('../services/notificacionService');
jest.mock('../lib/uploadConfig', () => {
  const actual = jest.requireActual<typeof import('../lib/uploadConfig')>('../lib/uploadConfig');
  return {
    ...actual,
    guardarArchivo: jest.fn().mockResolvedValue('/uploads/entregas/envio-1/foto-1.jpg'),
  };
});

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      incidencia: { create: jest.fn() },
      notificacion: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      usuario: { findUnique: jest.fn() },
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

const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

const okResponse: ConfirmarEntregaResponseDto = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-20260607-AAAA1111',
  estado: 'ENTREGADO',
  evidenciaFoto: '/uploads/entregas/envio-1/foto-1.jpg',
  firma: '/uploads/entregas/envio-1/firma-1.png',
  fechaEntrega: '2026-06-07T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/envios/:id/confirmar — Confirmación de entrega', () => {
  it('R7 - debe confirmar la entrega, actualizar estado a ENTREGADO, persistir foto/firma y crear EventoEnvio', async () => {
    mockedEntregaService.confirmarEntrega.mockResolvedValue(okResponse);

    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Entrega confirmada');
    expect(res.body.data.estado).toBe('ENTREGADO');
    expect(res.body.data.evidenciaFoto).toBeTruthy();
    expect(res.body.data.firma).toBeTruthy();
    expect(res.body.data.fechaEntrega).toBeTruthy();
    expect(mockedEntregaService.confirmarEntrega).toHaveBeenCalledWith(
      'envio-1',
      'user-rep-1',
      expect.objectContaining({ foto: expect.anything(), firma: expect.anything() }),
    );
  });

  it('R9 - debe rechazar la petición si falta el archivo foto o firma', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('MISSING_FILE');
    expect(mockedEntregaService.confirmarEntrega).not.toHaveBeenCalled();
  });

  it('R10 - debe devolver 404 si el envío no existe', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.confirmarEntrega.mockRejectedValue(
      new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404),
    );

    const res = await request(app)
      .post('/api/v1/envios/inexistente/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  it('R11 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.confirmarEntrega.mockRejectedValue(
      new AppError('FORBIDDEN', 'El envío no está asignado a una ruta del repartidor', 403),
    );

    const res = await request(app)
      .post('/api/v1/envios/envio-ajeno/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('R12 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.confirmarEntrega.mockRejectedValue(
      new AppError('INVALID_STATE_TRANSITION', 'No se puede modificar un envío en estado ENTREGADO', 409),
    );

    const res = await request(app)
      .post('/api/v1/envios/envio-terminal/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('R13 - debe rechazar la petición sin token', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('R14 - debe rechazar la petición de un usuario sin rol REPARTIDOR', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Service-level tests (real entregaService + mocked repos) — R8 (Notificacion)
// Mismo patrón que rutas.test.ts: se carga el servicio real en un registro de
// módulos aislado junto al repositorio auto-mockeado para verificar la
// orquestación real (creación de la Notificacion al confirmar).
// ──────────────────────────────────────────────────────────────────────────

type EntregaRepoMock = jest.Mocked<
  typeof import('../repositories/entregaRepository').entregaRepository
>;
type RutaRepoMock = jest.Mocked<
  typeof import('../repositories/rutaRepository').rutaRepository
>;
type NotificacionServiceMock = jest.Mocked<
  typeof import('../services/notificacionService').notificacionService
>;
type EntregaServiceReal = typeof import('../services/entregaService').entregaService;

function loadServiceWithMockedRepos(): {
  service: EntregaServiceReal;
  entregaRepo: EntregaRepoMock;
  rutaRepo: RutaRepoMock;
  notifService: NotificacionServiceMock;
} {
  let service!: EntregaServiceReal;
  let entregaRepo!: EntregaRepoMock;
  let rutaRepo!: RutaRepoMock;
  let notifService!: NotificacionServiceMock;

  jest.isolateModules(() => {
    jest.unmock('../services/entregaService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    entregaRepo = require('../repositories/entregaRepository').entregaRepository as EntregaRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rutaRepo = require('../repositories/rutaRepository').rutaRepository as RutaRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifService = require('../services/notificacionService').notificacionService as NotificacionServiceMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/entregaService').entregaService as EntregaServiceReal;
  });

  return { service, entregaRepo, rutaRepo, notifService };
}

describe('entregaService.confirmarEntrega — lógica de negocio (real + repos mockeados)', () => {
  it('R8 - debe llamar a notificacionService.notificar para el cliente al confirmar la entrega', async () => {
    const { service, entregaRepo, rutaRepo, notifService } = loadServiceWithMockedRepos();

    rutaRepo.findRepartidorByUsuarioId.mockResolvedValue({
      id: 'repartidor-1',
      usuarioId: 'user-rep-1',
      licencia: null,
      disponible: true,
    });

    entregaRepo.findEnvioConRutaYCliente.mockResolvedValue({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260607-AAAA1111',
      estado: 'EN_RUTA',
      destinatario: 'María López',
      direccionDestino: 'Calle 123',
      remitente: 'Juan',
      peso: 1,
      dimensiones: '10x10x10',
      descripcion: null,
      lat: null,
      lng: null,
      clienteId: 'cliente-1',
      rutaId: 'ruta-1',
      evidenciaFoto: null,
      firma: null,
      fechaReprogramacion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ruta: {
        id: 'ruta-1',
        codigo: 'RUTA-1',
        nombre: null,
        estado: 'PENDIENTE',
        repartidorId: 'repartidor-1',
        vehiculoId: 'vehiculo-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      cliente: {
        id: 'cliente-1',
        usuarioId: 'user-cliente-9',
        usuario: {
          id: 'user-cliente-9',
          nombre: 'Cliente Test',
          correo: 'cliente@test.com',
          password: 'hashed',
          telefono: null,
          rol: 'CLIENTE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    } satisfies EnvioConRutaYCliente);

    const envioActualizado: Envio = {
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260607-AAAA1111',
      estado: 'ENTREGADO',
      destinatario: 'María López',
      direccionDestino: 'Calle 123',
      remitente: 'Juan',
      peso: 1,
      dimensiones: '10x10x10',
      descripcion: null,
      lat: null,
      lng: null,
      clienteId: 'cliente-1',
      rutaId: 'ruta-1',
      evidenciaFoto: '/uploads/entregas/envio-1/foto-1.jpg',
      firma: '/uploads/entregas/envio-1/firma-1.png',
      fechaReprogramacion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const eventoCreado: EventoEnvio = {
      id: 'evento-1',
      envioId: 'envio-1',
      estado: 'ENTREGADO',
      descripcion: 'Entrega confirmada por el repartidor',
      lat: null,
      lng: null,
      timestamp: new Date('2026-06-07T10:00:00.000Z'),
    };

    entregaRepo.confirmarEntrega.mockResolvedValue({
      envio: envioActualizado,
      evento: eventoCreado,
    });

    notifService.notificar.mockResolvedValue({
      id: 'notif-1',
      tipo: 'ENTREGA_REALIZADA',
      mensaje: 'Tu envío TRK-20260607-AAAA1111 fue entregado',
      leida: false,
      envioId: 'envio-1',
      createdAt: new Date().toISOString(),
    } as never);

    await service.confirmarEntrega('envio-1', 'user-rep-1', {
      foto: makeMulterFile('foto', 'image/jpeg', Buffer.from('x')),
      firma: makeMulterFile('firma', 'image/png', Buffer.from('y')),
    });

    expect(notifService.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'user-cliente-9',
        envioId: 'envio-1',
        mensaje: expect.stringContaining('entregado'),
        tipo: 'ENTREGA_REALIZADA',
      }),
    );
  });
});
