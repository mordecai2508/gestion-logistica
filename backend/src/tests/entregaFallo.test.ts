import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { entregaService } from '../services/entregaService';
import { Rol } from '@prisma/client';
import type { Envio, Incidencia } from '@prisma/client';
import type { RegistrarFalloResponseDto } from '../types/entregaTypes';
import type { EnvioConRutaYCliente } from '../repositories/entregaRepository';

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

const okResponse: RegistrarFalloResponseDto = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-20260607-AAAA1111',
  estado: 'FALLIDO',
  incidenciaId: 'incidencia-1',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/envios/:id/fallo — Registro de fallo de entrega', () => {
  it('R15 - debe registrar el fallo, actualizar estado a FALLIDO, crear EventoEnvio e Incidencia ENTREGA_FALLIDA con nota y foto', async () => {
    mockedEntregaService.registrarFallo.mockResolvedValue(okResponse);

    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'Cliente ausente en la dirección')
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Fallo de entrega registrado');
    expect(res.body.data.estado).toBe('FALLIDO');
    expect(res.body.data.incidenciaId).toBe('incidencia-1');
    expect(mockedEntregaService.registrarFallo).toHaveBeenCalledWith(
      'envio-1',
      'user-rep-1',
      expect.objectContaining({
        nota: 'Cliente ausente en la dirección',
        foto: expect.anything(),
      }),
    );
  });

  it('R17 - debe rechazar la petición sin nota o con nota vacía', async () => {
    const resSinNota = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(resSinNota.status).toBe(422);
    expect(mockedEntregaService.registrarFallo).not.toHaveBeenCalled();

    const resNotaVacia = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', '');

    expect(resNotaVacia.status).toBe(422);
    expect(mockedEntregaService.registrarFallo).not.toHaveBeenCalled();
  });

  it('R18 - debe devolver 404 si el envío no existe', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.registrarFallo.mockRejectedValue(
      new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404),
    );

    const res = await request(app)
      .post('/api/v1/envios/inexistente/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'No fue posible entregar');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENVIO_NOT_FOUND');
  });

  it('R19 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.registrarFallo.mockRejectedValue(
      new AppError('FORBIDDEN', 'El envío no está asignado a una ruta del repartidor', 403),
    );

    const res = await request(app)
      .post('/api/v1/envios/envio-ajeno/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'No fue posible entregar');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('R20 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo', async () => {
    const { AppError } = await import('../lib/appError');
    mockedEntregaService.registrarFallo.mockRejectedValue(
      new AppError('INVALID_STATE_TRANSITION', 'No se puede modificar un envío en estado FALLIDO', 409),
    );

    const res = await request(app)
      .post('/api/v1/envios/envio-terminal/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'No fue posible entregar');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('R21 - debe rechazar la petición sin token', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .field('nota', 'No fue posible entregar');

    expect(res.status).toBe(401);
  });

  it('R22 - debe rechazar la petición de un usuario sin rol REPARTIDOR', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`)
      .field('nota', 'No fue posible entregar');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Service-level tests (real entregaService + mocked repos) — R15/R16
// Mismo patrón que entregaConfirmar.test.ts: se carga el servicio real en un
// registro de módulos aislado junto al repositorio auto-mockeado para verificar
// la orquestación real (creación de la Incidencia y la Notificacion al fallar).
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

function makeEnvioConRutaYCliente(): EnvioConRutaYCliente {
  return {
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
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };
}

const envioFallido: Envio = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-20260607-AAAA1111',
  estado: 'FALLIDO',
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
};

const incidenciaCreada: Incidencia = {
  id: 'incidencia-1',
  tipo: 'ENTREGA_FALLIDA',
  descripcion: 'Intento de entrega fallido',
  estado: 'ABIERTA',
  foto: null,
  nota: 'Cliente ausente',
  createdAt: new Date(),
  updatedAt: new Date(),
  envioId: 'envio-1',
};

describe('entregaService.registrarFallo — lógica de negocio (real + repos mockeados)', () => {
  it('R15 - debe cambiar el estado a FALLIDO y crear la Incidencia ENTREGA_FALLIDA con la nota', async () => {
    const { service, entregaRepo, rutaRepo, notifService } = loadServiceWithMockedRepos();

    rutaRepo.findRepartidorByUsuarioId.mockResolvedValue({
      id: 'repartidor-1',
      usuarioId: 'user-rep-1',
      licencia: null,
      disponible: true,
    });

    entregaRepo.findEnvioConRutaYCliente.mockResolvedValue(makeEnvioConRutaYCliente());
    entregaRepo.registrarFallo.mockResolvedValue({
      envio: envioFallido,
      incidencia: incidenciaCreada,
    });
    notifService.notificar.mockResolvedValue({
      id: 'notif-1',
      usuarioId: 'user-cliente-9',
      envioId: 'envio-1',
      mensaje: 'No fue posible entregar',
      tipo: 'CAMBIO_ESTADO',
      leida: false,
      createdAt: new Date().toISOString(),
    } as never);

    const result = await service.registrarFallo('envio-1', 'user-rep-1', {
      nota: 'Cliente ausente',
    });

    expect(result.estado).toBe('FALLIDO');
    expect(result.incidenciaId).toBe('incidencia-1');
    expect(entregaRepo.registrarFallo).toHaveBeenCalledWith(
      'envio-1',
      expect.objectContaining({ nota: 'Cliente ausente', foto: null }),
    );
  });

  it('R16 - debe llamar a notificacionService.notificar para el cliente al registrar el fallo', async () => {
    const { service, entregaRepo, rutaRepo, notifService } = loadServiceWithMockedRepos();

    rutaRepo.findRepartidorByUsuarioId.mockResolvedValue({
      id: 'repartidor-1',
      usuarioId: 'user-rep-1',
      licencia: null,
      disponible: true,
    });

    entregaRepo.findEnvioConRutaYCliente.mockResolvedValue(makeEnvioConRutaYCliente());
    entregaRepo.registrarFallo.mockResolvedValue({
      envio: envioFallido,
      incidencia: incidenciaCreada,
    });
    notifService.notificar.mockResolvedValue({
      id: 'notif-1',
      tipo: 'CAMBIO_ESTADO',
      mensaje: 'No fue posible entregar',
      leida: false,
      envioId: 'envio-1',
      createdAt: new Date().toISOString(),
    } as never);

    await service.registrarFallo('envio-1', 'user-rep-1', { nota: 'Cliente ausente' });

    expect(notifService.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'user-cliente-9',
        envioId: 'envio-1',
        mensaje: expect.stringContaining('No fue posible entregar'),
        tipo: 'CAMBIO_ESTADO',
      }),
    );
  });
});
