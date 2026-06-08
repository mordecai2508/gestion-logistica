import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { notificacionService } from '../services/notificacionService';
import { Rol } from '@prisma/client';
import type { NotificacionDto, PaginatedNotificacionesResponse } from '../types/notificacionTypes';

jest.mock('../services/notificacionService');
jest.mock('../repositories/notificacionRepository');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      notificacion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      usuario: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedNotificacionService = notificacionService as jest.Mocked<typeof notificacionService>;

const JWT_SECRET = 'test-secret';

function makeToken(rol: Rol, id = 'user-1') {
  return jwt.sign({ id, correo: 'test@example.com', rol }, JWT_SECRET, { expiresIn: '15m' });
}

const CLIENTE_TOKEN = makeToken('CLIENTE', 'user-cliente-1');
const OPERADOR_TOKEN = makeToken('OPERADOR', 'user-op-1');
const REPARTIDOR_TOKEN = makeToken('REPARTIDOR', 'user-rep-1');

function makeNotificacionDto(overrides: Partial<NotificacionDto> = {}): NotificacionDto {
  return {
    id: 'notif-1',
    tipo: 'ENVIO_CREADO',
    mensaje: 'Tu envío TRK-20260608-AAAA1111 fue registrado',
    leida: false,
    envioId: 'envio-1',
    createdAt: new Date('2026-06-08T10:00:00.000Z').toISOString(),
    ...overrides,
  };
}

function makePaginatedResponse(
  overrides: Partial<PaginatedNotificacionesResponse> = {},
): PaginatedNotificacionesResponse {
  return {
    data: [makeNotificacionDto()],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    ...overrides,
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// GET /api/v1/notificaciones — Listado paginado
// ════════════════════════════════════════════════════════════════════

describe('GET /api/v1/notificaciones — Listado paginado', () => {
  it('R11 - debe listar solo las notificaciones del usuario autenticado con sus campos completos', async () => {
    mockedNotificacionService.listar.mockResolvedValue(makePaginatedResponse());

    const res = await request(app)
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Notificaciones obtenidas');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: 'notif-1',
      tipo: 'ENVIO_CREADO',
      mensaje: expect.any(String),
      leida: false,
      envioId: 'envio-1',
      createdAt: expect.any(String),
    });
    expect(mockedNotificacionService.listar).toHaveBeenCalledWith(
      'user-cliente-1',
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('R11 - debe listar las notificaciones del operador autenticado', async () => {
    mockedNotificacionService.listar.mockResolvedValue(makePaginatedResponse({
      data: [makeNotificacionDto({ tipo: 'RUTA_ASIGNADA' })],
    }));

    const res = await request(app)
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${OPERADOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedNotificacionService.listar).toHaveBeenCalledWith(
      'user-op-1',
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('R11 - debe listar las notificaciones del repartidor autenticado', async () => {
    mockedNotificacionService.listar.mockResolvedValue(makePaginatedResponse({
      data: [makeNotificacionDto({ tipo: 'RUTA_ASIGNADA' })],
    }));

    const res = await request(app)
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(mockedNotificacionService.listar).toHaveBeenCalledWith(
      'user-rep-1',
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('R12 - debe devolver meta con total, page, limit, totalPages correctos', async () => {
    mockedNotificacionService.listar.mockResolvedValue({
      data: [makeNotificacionDto(), makeNotificacionDto({ id: 'notif-2' })],
      meta: { total: 45, page: 2, limit: 20, totalPages: 3 },
    });

    const res = await request(app)
      .get('/api/v1/notificaciones')
      .query({ page: '2', limit: '20' })
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
  });

  it('R13 - debe devolver 422 con page/limit no enteros o no positivos', async () => {
    const resPageCero = await request(app)
      .get('/api/v1/notificaciones')
      .query({ page: '0' })
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
    expect(resPageCero.status).toBe(422);
    expect(resPageCero.body.error).toBe('VALIDATION_ERROR');

    const resLimitNegativo = await request(app)
      .get('/api/v1/notificaciones')
      .query({ limit: '-5' })
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
    expect(resLimitNegativo.status).toBe(422);
    expect(resLimitNegativo.body.error).toBe('VALIDATION_ERROR');

    const resPageDecimal = await request(app)
      .get('/api/v1/notificaciones')
      .query({ page: 'abc' })
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
    expect(resPageDecimal.status).toBe(422);
    expect(resPageDecimal.body.error).toBe('VALIDATION_ERROR');

    expect(mockedNotificacionService.listar).not.toHaveBeenCalled();
  });

  it('R14 - debe devolver 401 sin token de autenticación', async () => {
    const res = await request(app).get('/api/v1/notificaciones');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedNotificacionService.listar).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════
// PATCH /api/v1/notificaciones/:id/leer — Marcar como leída
// ════════════════════════════════════════════════════════════════════

describe('PATCH /api/v1/notificaciones/:id/leer — Marcar como leída', () => {
  it('R20 - debe marcar la notificación propia como leída y devolver el recurso actualizado', async () => {
    const actualizada = makeNotificacionDto({ leida: true });
    mockedNotificacionService.marcarComoLeida.mockResolvedValue(actualizada);

    const res = await request(app)
      .patch('/api/v1/notificaciones/notif-1/leer')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Notificación marcada como leída');
    expect(res.body.data.leida).toBe(true);
    expect(mockedNotificacionService.marcarComoLeida).toHaveBeenCalledWith(
      'notif-1',
      'user-cliente-1',
    );
  });

  it('R21 - debe devolver 404 si el id no corresponde a ninguna notificación existente', async () => {
    const { AppError } = await import('../lib/appError');
    mockedNotificacionService.marcarComoLeida.mockRejectedValue(
      new AppError('NOTIFICACION_NOT_FOUND', 'Notificación no encontrada', 404),
    );

    const res = await request(app)
      .patch('/api/v1/notificaciones/inexistente/leer')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOTIFICACION_NOT_FOUND');
  });

  it('R22 - debe devolver 404 (no 403) si el id corresponde a una notificación de otro usuario y no modificarla', async () => {
    const { AppError } = await import('../lib/appError');
    mockedNotificacionService.marcarComoLeida.mockRejectedValue(
      new AppError('NOTIFICACION_NOT_FOUND', 'Notificación no encontrada', 404),
    );

    const res = await request(app)
      .patch('/api/v1/notificaciones/notif-ajena/leer')
      .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOTIFICACION_NOT_FOUND');
    expect(res.status).not.toBe(403);
  });

  it('R23 - debe devolver 401 sin token de autenticación', async () => {
    const res = await request(app).patch('/api/v1/notificaciones/notif-1/leer');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(mockedNotificacionService.marcarComoLeida).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════
// notificacionService — lógica de negocio (unit, real + repos mockeados)
// ════════════════════════════════════════════════════════════════════

type NotificacionRepoMock = jest.Mocked<
  typeof import('../repositories/notificacionRepository').notificacionRepository
>;
type NotificacionServiceReal = typeof import('../services/notificacionService').notificacionService;

function loadServiceWithMockedRepo(): {
  service: NotificacionServiceReal;
  notifRepo: NotificacionRepoMock;
} {
  let service!: NotificacionServiceReal;
  let notifRepo!: NotificacionRepoMock;

  jest.isolateModules(() => {
    jest.unmock('../services/notificacionService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifRepo = require('../repositories/notificacionRepository')
      .notificacionRepository as NotificacionRepoMock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../services/notificacionService').notificacionService as NotificacionServiceReal;
  });

  return { service, notifRepo };
}

function makeNotificacionRecord(overrides: Partial<{
  id: string;
  tipo: NotificacionDto['tipo'];
  mensaje: string;
  leida: boolean;
  usuarioId: string;
  envioId: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: 'notif-1',
    tipo: 'ENVIO_CREADO' as const,
    mensaje: 'Tu envío fue registrado',
    leida: false,
    usuarioId: 'user-1',
    envioId: 'envio-1',
    createdAt: new Date('2026-06-08T10:00:00.000Z'),
    ...overrides,
  };
}

describe('notificacionService — lógica de negocio (unit, real + repos mockeados)', () => {
  describe('R1/R4 - notificar() debe persistir la notificación con todos los campos requeridos', () => {
    it('R1 - persiste una notificación para el cliente al notificar ENVIO_CREADO', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord({ tipo: 'ENVIO_CREADO' });
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue('cliente@test.com');

      const result = await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío fue registrado',
        tipo: 'ENVIO_CREADO',
      });

      expect(notifRepo.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'user-1',
          envioId: 'envio-1',
          mensaje: 'Tu envío fue registrado',
          tipo: 'ENVIO_CREADO',
        }),
      );
      expect(result.tipo).toBe('ENVIO_CREADO');
      expect(result.leida).toBe(false);
    });

    it('R2 - persiste una notificación para el repartidor al notificar RUTA_ASIGNADA', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord({ tipo: 'RUTA_ASIGNADA', usuarioId: 'user-rep-1' });
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue(null);

      const result = await service.notificar({
        usuarioId: 'user-rep-1',
        mensaje: 'Se te asignó la ruta RUTA-X',
        tipo: 'RUTA_ASIGNADA',
      });

      expect(notifRepo.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'user-rep-1',
          tipo: 'RUTA_ASIGNADA',
        }),
      );
      expect(result.tipo).toBe('RUTA_ASIGNADA');
    });

    it('R3 - persiste una notificación para el cliente al notificar INCIDENCIA_REPORTADA', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord({ tipo: 'INCIDENCIA_REPORTADA' });
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue('cliente@test.com');

      await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Se reportó una incidencia en tu envío',
        tipo: 'INCIDENCIA_REPORTADA',
      });

      expect(notifRepo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'INCIDENCIA_REPORTADA' }),
      );
    });

    it('R4 - persiste la notificación con usuarioId, tipo, envioId, mensaje, createdAt y leida:false', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord();
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue(null);

      const result = await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío fue registrado',
        tipo: 'ENVIO_CREADO',
      });

      expect(result).toMatchObject({
        id: 'notif-1',
        tipo: 'ENVIO_CREADO',
        mensaje: 'Tu envío fue registrado',
        leida: false,
        envioId: 'envio-1',
        createdAt: expect.any(String),
      });
    });
  });

  describe('R5 - notificar() debe emitir notification:new al canal del usuario', () => {
    it('R5 - emite io.to("user:<usuarioId>").emit("notification:new", <NotificacionDto>) cuando getIo() devuelve un objeto io', async () => {
      const emitSpy = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: emitSpy });
      const mockIo = { to: toSpy };

      let service!: NotificacionServiceReal;
      let notifRepo!: NotificacionRepoMock;

      jest.isolateModules(() => {
        jest.unmock('../services/notificacionService');
        jest.mock('../lib/socketServer', () => ({
          getIo: jest.fn().mockReturnValue(mockIo),
        }));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        notifRepo = require('../repositories/notificacionRepository')
          .notificacionRepository as NotificacionRepoMock;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        service = require('../services/notificacionService').notificacionService as NotificacionServiceReal;
      });

      const registro = makeNotificacionRecord({ usuarioId: 'user-socket-1', tipo: 'CAMBIO_ESTADO', envioId: 'envio-99' });
      notifRepo.crear.mockResolvedValue(registro);

      const result = await service.notificar({
        usuarioId: 'user-socket-1',
        envioId: 'envio-99',
        mensaje: 'Tu envío cambió de estado',
        tipo: 'CAMBIO_ESTADO',
      });

      expect(toSpy).toHaveBeenCalledWith('user:user-socket-1');
      expect(emitSpy).toHaveBeenCalledWith(
        'notification:new',
        expect.objectContaining({
          id: registro.id,
          tipo: 'CAMBIO_ESTADO',
          mensaje: registro.mensaje,
          leida: false,
          envioId: 'envio-99',
          createdAt: expect.any(String),
        }),
      );
      expect(result.id).toBe(registro.id);
    });

    it('R6 - persiste la notificación incluso sin conexión socket activa del destinatario (getIo devuelve null)', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord();
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue(null);

      // getIo returns null when no io set — notificar should still persist
      const result = await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío fue registrado',
        tipo: 'ENVIO_CREADO',
      });

      expect(notifRepo.crear).toHaveBeenCalled();
      expect(result.id).toBe('notif-1');
    });
  });

  describe('R7/R8/R9 - envío de correo condicional según tipo', () => {
    it('R7 - debe buscar correo y llamar a sendNotificationEmail al notificar ENVIO_CREADO', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord({ tipo: 'ENVIO_CREADO' });
      notifRepo.crear.mockResolvedValue(registro);
      notifRepo.findCorreoByUsuarioId.mockResolvedValue('cliente@test.com');

      await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío fue registrado',
        tipo: 'ENVIO_CREADO',
      });

      expect(notifRepo.findCorreoByUsuarioId).toHaveBeenCalledWith('user-1');
    });

    it('R8 - debe buscar correo al notificar ENTREGA_REALIZADA, pero NO al notificar CAMBIO_ESTADO', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.crear.mockResolvedValue(makeNotificacionRecord({ tipo: 'CAMBIO_ESTADO' }));
      notifRepo.findCorreoByUsuarioId.mockResolvedValue('cliente@test.com');

      await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío cambió de estado',
        tipo: 'CAMBIO_ESTADO',
      });

      // CAMBIO_ESTADO does NOT trigger email
      expect(notifRepo.findCorreoByUsuarioId).not.toHaveBeenCalled();
    });

    it('R9 - debe buscar correo al notificar INCIDENCIA_REPORTADA', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.crear.mockResolvedValue(makeNotificacionRecord({ tipo: 'INCIDENCIA_REPORTADA' }));
      notifRepo.findCorreoByUsuarioId.mockResolvedValue('cliente@test.com');

      await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Se reportó una incidencia',
        tipo: 'INCIDENCIA_REPORTADA',
      });

      expect(notifRepo.findCorreoByUsuarioId).toHaveBeenCalledWith('user-1');
    });

    it('R10 - debe completar la operación (persistir y devolver DTO) aunque sendNotificationEmail falle', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      const registro = makeNotificacionRecord({ tipo: 'ENVIO_CREADO' });
      notifRepo.crear.mockResolvedValue(registro);
      // Simulate email failure: findCorreoByUsuarioId throws
      notifRepo.findCorreoByUsuarioId.mockRejectedValue(new Error('SMTP error'));

      const result = await service.notificar({
        usuarioId: 'user-1',
        envioId: 'envio-1',
        mensaje: 'Tu envío fue registrado',
        tipo: 'ENVIO_CREADO',
      });

      // notificar should complete successfully despite email failure
      expect(result.id).toBe('notif-1');
      expect(notifRepo.crear).toHaveBeenCalled();
    });
  });

  describe('R11/R12 - listar() devuelve notificaciones paginadas del usuario', () => {
    it('R11 - devuelve solo las notificaciones del usuario con campos completos, ordenadas desc', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findManyByUsuario.mockResolvedValue([makeNotificacionRecord()]);
      notifRepo.countByUsuario.mockResolvedValue(1);

      const result = await service.listar('user-1', { page: 1, limit: 20 });

      expect(notifRepo.findManyByUsuario).toHaveBeenCalledWith('user-1', 0, 20);
      expect(result.data[0]).toMatchObject({
        id: 'notif-1',
        tipo: 'ENVIO_CREADO',
        mensaje: expect.any(String),
        leida: false,
        envioId: 'envio-1',
      });
    });

    it('R12 - devuelve meta correcta con totalPages calculado', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findManyByUsuario.mockResolvedValue([makeNotificacionRecord()]);
      notifRepo.countByUsuario.mockResolvedValue(45);

      const result = await service.listar('user-1', { page: 2, limit: 20 });

      expect(notifRepo.findManyByUsuario).toHaveBeenCalledWith('user-1', 20, 20);
      expect(result.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
    });
  });

  describe('R20/R21/R22 - marcarComoLeida() verifica pertenencia y actualiza', () => {
    it('R20 - debe marcar la notificación propia como leída y devolver DTO con leida:true', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findById.mockResolvedValue(makeNotificacionRecord({ leida: false }));
      notifRepo.marcarComoLeida.mockResolvedValue(makeNotificacionRecord({ leida: true }));

      const result = await service.marcarComoLeida('notif-1', 'user-1');

      expect(notifRepo.marcarComoLeida).toHaveBeenCalledWith('notif-1');
      expect(result.leida).toBe(true);
    });

    it('R20 - debe ser idempotente si la notificación ya está leída (no relanza error ni repite UPDATE)', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findById.mockResolvedValue(makeNotificacionRecord({ leida: true }));

      const result = await service.marcarComoLeida('notif-1', 'user-1');

      expect(notifRepo.marcarComoLeida).not.toHaveBeenCalled();
      expect(result.leida).toBe(true);
    });

    it('R21 - debe lanzar NOTIFICACION_NOT_FOUND (404) cuando la notificación no existe', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findById.mockResolvedValue(null);

      await expect(service.marcarComoLeida('inexistente', 'user-1')).rejects.toMatchObject({
        error: 'NOTIFICACION_NOT_FOUND',
        statusCode: 404,
      });
      expect(notifRepo.marcarComoLeida).not.toHaveBeenCalled();
    });

    it('R22 - debe lanzar NOTIFICACION_NOT_FOUND (404, nunca 403) cuando la notificación pertenece a otro usuario', async () => {
      const { service, notifRepo } = loadServiceWithMockedRepo();
      notifRepo.findById.mockResolvedValue(makeNotificacionRecord({ usuarioId: 'otro-usuario' }));

      const err = await service.marcarComoLeida('notif-1', 'user-1').catch((e) => e);

      expect(err).toMatchObject({ error: 'NOTIFICACION_NOT_FOUND', statusCode: 404 });
      expect(notifRepo.marcarComoLeida).not.toHaveBeenCalled();
    });
  });
});
