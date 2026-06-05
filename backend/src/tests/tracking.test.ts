import request from 'supertest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { app, server } from '../index';
import { trackingRepository } from '../repositories/trackingRepository';
import { envioRepository } from '../repositories/envioRepository';
import { EstadoEnvio } from '@prisma/client';

jest.mock('../repositories/trackingRepository');
jest.mock('../repositories/envioRepository');

jest.mock('@prisma/client', () => {
  const original = jest.requireActual('@prisma/client');
  return {
    ...original,
    PrismaClient: jest.fn().mockImplementation(() => ({
      envio: { findUnique: jest.fn() },
      eventoEnvio: { create: jest.fn() },
      $transaction: jest.fn(),
    })),
  };
});

const mockedTrackingRepo = trackingRepository as jest.Mocked<typeof trackingRepository>;
const mockedEnvioRepo = envioRepository as jest.Mocked<typeof envioRepository>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeEnvioBase(overrides: Partial<{
  id: string;
  codigoSeguimiento: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  estado: EstadoEnvio;
  clienteId: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: 'envio-track-1',
    codigoSeguimiento: 'TRK-20260605-ABCD1234',
    remitente: 'Remitente Test',
    destinatario: 'Destinatario Test',
    direccionDestino: 'Calle Test 123',
    estado: EstadoEnvio.PENDIENTE,
    clienteId: 'cliente-1',
    rutaId: null,
    evidenciaFoto: null,
    firma: null,
    fechaReprogramacion: null,
    peso: 1.0,
    dimensiones: '10x10x10',
    descripcion: null,
    createdAt: new Date('2026-06-05T10:00:00.000Z'),
    updatedAt: new Date('2026-06-05T10:00:00.000Z'),
    ...overrides,
  };
}

function makeEventoBase(overrides: Partial<{
  id: string;
  envioId: string;
  estado: EstadoEnvio;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: Date;
}> = {}) {
  return {
    id: 'evento-1',
    envioId: 'envio-track-1',
    estado: EstadoEnvio.PENDIENTE,
    descripcion: 'Envío creado',
    lat: null,
    lng: null,
    timestamp: new Date('2026-06-05T10:00:00.000Z'),
    ...overrides,
  };
}

function makeEnvioConEventos(eventosOverrides: ReturnType<typeof makeEventoBase>[] = []) {
  return {
    ...makeEnvioBase(),
    eventos: eventosOverrides.length > 0 ? eventosOverrides : [makeEventoBase()],
  };
}

function makeEnvioConDetalle() {
  return {
    ...makeEnvioBase(),
    eventos: [makeEventoBase()],
    cliente: {
      id: 'cliente-1',
      usuarioId: 'user-1',
      usuario: {
        id: 'user-1',
        nombre: 'Cliente Test',
        correo: 'cliente@test.com',
        password: 'hashed',
        telefono: null,
        rol: 'CLIENTE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// describe('rastreo_paquete') — HTTP endpoint tests
// ──────────────────────────────────────────────────────────────────────────────

describe('rastreo_paquete', () => {
  describe('GET /api/v1/tracking/:codigo — HTTP 200 con TrackingResponseDto', () => {
    it('R1/R2/R3 — debe retornar HTTP 200 con TrackingResponseDto y eventos ordenados por timestamp ASC', async () => {
      const evento1 = makeEventoBase({
        id: 'ev-1',
        timestamp: new Date('2026-06-05T10:00:00.000Z'),
        descripcion: 'Envío creado',
      });
      const evento2 = makeEventoBase({
        id: 'ev-2',
        estado: EstadoEnvio.EN_TRANSITO,
        descripcion: 'En tránsito',
        lat: 4.711,
        lng: -74.0721,
        timestamp: new Date('2026-06-05T14:30:00.000Z'),
      });
      mockedTrackingRepo.findByCodigo.mockResolvedValue(
        makeEnvioConEventos([evento1, evento2]),
      );

      const res = await request(app).get('/api/v1/tracking/TRK-20260605-ABCD1234');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Envío encontrado');
      expect(res.body.status).toBe(200);
      expect(res.body.data.envioId).toBe('envio-track-1');
      expect(res.body.data.codigoSeguimiento).toBe('TRK-20260605-ABCD1234');
      expect(res.body.data.remitente).toBe('Remitente Test');
      expect(res.body.data.destinatario).toBe('Destinatario Test');
      expect(Array.isArray(res.body.data.eventos)).toBe(true);
      expect(res.body.data.eventos).toHaveLength(2);
      // eventos ordenados ASC por timestamp
      expect(new Date(res.body.data.eventos[0].timestamp).getTime()).toBeLessThan(
        new Date(res.body.data.eventos[1].timestamp).getTime(),
      );
      // ultimaActualizacion es el timestamp del último evento
      expect(res.body.data.ultimaActualizacion).toBe(evento2.timestamp.toISOString());
    });
  });

  describe('GET /api/v1/tracking/:codigo — HTTP 404 cuando no existe', () => {
    it('R4 — debe retornar HTTP 404 cuando el código no existe en la BD', async () => {
      mockedTrackingRepo.findByCodigo.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/tracking/TRK-20260605-ABCD1234');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ENVIO_NOT_FOUND');
      expect(res.body.message).toBe('Envío no encontrado');
    });
  });

  describe('GET /api/v1/tracking/:codigo — HTTP 200 sin Authorization', () => {
    it('R5 — debe retornar HTTP 200 sin header Authorization', async () => {
      mockedTrackingRepo.findByCodigo.mockResolvedValue(makeEnvioConEventos());

      const res = await request(app)
        .get('/api/v1/tracking/TRK-20260605-ABCD1234');
      // Verify no Authorization header was set - request has no auth header
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/tracking/:codigo — HTTP 422 cuando formato inválido', () => {
    it('R6 — debe retornar HTTP 422 cuando el código no tiene formato TRK-YYYYMMDD-XXXXXXXX', async () => {
      const res = await request(app).get('/api/v1/tracking/INVALID');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('R6 — debe retornar HTTP 422 para código con letras minúsculas', async () => {
      const res = await request(app).get('/api/v1/tracking/TRK-20260605-abcd1234');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Socket.IO tests
  // ──────────────────────────────────────────────────────────────────────────────

  describe('Socket.IO — location:update', () => {
    let clientSocket: ClientSocket;
    let listenerSocket: ClientSocket;

    beforeEach((done) => {
      if (!server.listening) {
        server.listen(0, () => {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const url = `http://localhost:${port}`;
          clientSocket = ioClient(url, { transports: ['websocket'] });
          listenerSocket = ioClient(url, { transports: ['websocket'] });
          let connected = 0;
          const onConnect = () => {
            connected += 1;
            if (connected === 2) done();
          };
          clientSocket.on('connect', onConnect);
          listenerSocket.on('connect', onConnect);
        });
      } else {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const url = `http://localhost:${port}`;
        clientSocket = ioClient(url, { transports: ['websocket'] });
        listenerSocket = ioClient(url, { transports: ['websocket'] });
        let connected = 0;
        const onConnect = () => {
          connected += 1;
          if (connected === 2) done();
        };
        clientSocket.on('connect', onConnect);
        listenerSocket.on('connect', onConnect);
      }
    });

    afterEach(() => {
      clientSocket.disconnect();
      listenerSocket.disconnect();
    });

    it('R8 — debe emitir tracking:location a la sala tracking:${envioId} al recibir location:update válido', (done) => {
      const envioId = 'clhqzv2k10000qwer5678abcd';
      mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle());
      mockedTrackingRepo.createEventoUbicacion.mockResolvedValue({
        id: 'ev-new',
        envioId,
        estado: EstadoEnvio.PENDIENTE,
        descripcion: 'Actualización de ubicación',
        lat: 4.711,
        lng: -74.0721,
        timestamp: new Date(),
      });

      listenerSocket.emit('tracking:join', { envioId });

      setTimeout(() => {
        listenerSocket.on('tracking:location', (data: unknown) => {
          const payload = data as { envioId: string; lat: number; lng: number; timestamp: string };
          expect(payload.envioId).toBe(envioId);
          expect(payload.lat).toBe(4.711);
          expect(payload.lng).toBe(-74.0721);
          expect(typeof payload.timestamp).toBe('string');
          done();
        });

        clientSocket.emit('location:update', { envioId, lat: 4.711, lng: -74.0721 });
      }, 100);
    });

    it('R9 — debe crear un EventoEnvio con lat, lng y descripcion "Actualización de ubicación"', (done) => {
      const envioId = 'clhqzv2k10000qwer5678abcd';
      mockedEnvioRepo.findById.mockResolvedValue(makeEnvioConDetalle());
      mockedTrackingRepo.createEventoUbicacion.mockResolvedValue({
        id: 'ev-new',
        envioId,
        estado: EstadoEnvio.PENDIENTE,
        descripcion: 'Actualización de ubicación',
        lat: 4.711,
        lng: -74.0721,
        timestamp: new Date(),
      });

      clientSocket.emit('location:update', { envioId, lat: 4.711, lng: -74.0721 });

      setTimeout(() => {
        expect(mockedTrackingRepo.createEventoUbicacion).toHaveBeenCalledWith(
          expect.objectContaining({
            envioId,
            lat: 4.711,
            lng: -74.0721,
            descripcion: 'Actualización de ubicación',
          }),
        );
        done();
      }, 200);
    });

    it('R10 — debe emitir tracking:error al socket emisor cuando envioId no existe', (done) => {
      const envioId = 'clhqzv2k10000qwer5678abcd';
      mockedEnvioRepo.findById.mockResolvedValue(null);

      clientSocket.on('tracking:error', (data: unknown) => {
        const payload = data as { message: string };
        expect(payload.message).toBe('Envío no encontrado');
        done();
      });

      clientSocket.emit('location:update', { envioId, lat: 4.711, lng: -74.0721 });
    });

    it('R11 — debe emitir tracking:error al socket emisor cuando el payload carece del campo lat', (done) => {
      const envioId = 'clhqzv2k10000qwer5678abcd';

      clientSocket.on('tracking:error', (data: unknown) => {
        const payload = data as { message: string };
        expect(payload.message).toBe('Payload inválido');
        done();
      });

      clientSocket.emit('location:update', { envioId, lng: -74.0721 });
    });
  });
});
