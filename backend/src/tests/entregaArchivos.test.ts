import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { entregaService } from '../services/entregaService';
import { Rol } from '@prisma/client';
import type { ConfirmarEntregaResponseDto } from '../types/entregaTypes';
import { MAX_FILE_SIZE_BYTES } from '../lib/uploadConfig';

jest.mock('../services/entregaService');
jest.mock('../repositories/entregaRepository');
jest.mock('../repositories/rutaRepository');
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
      notificacion: { create: jest.fn() },
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

const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
// Buffer que excede MAX_FILE_SIZE_BYTES (5MB) para forzar LIMIT_FILE_SIZE de multer.
const OVERSIZED_BUFFER = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 0x00);

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

describe('Validación de archivos subidos — POST /api/v1/envios/:id/confirmar y /fallo', () => {
  it('R23 - debe rechazar archivos con MIME type distinto de image/jpeg o image/png (confirmar) → 422 INVALID_FILE_TYPE sin modificar el envío', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', Buffer.from('%PDF-1.4 fake'), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('INVALID_FILE_TYPE');
    expect(mockedEntregaService.confirmarEntrega).not.toHaveBeenCalled();
  });

  it('R23 - debe rechazar archivos con MIME type no soportado (fallo) → 422 INVALID_FILE_TYPE sin modificar el envío', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'Cliente ausente')
      .attach('foto', Buffer.from('GIF89a fake'), {
        filename: 'animacion.gif',
        contentType: 'image/gif',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('INVALID_FILE_TYPE');
    expect(mockedEntregaService.registrarFallo).not.toHaveBeenCalled();
  });

  it('R24 - debe rechazar archivos que excedan 5MB (confirmar) → 422 FILE_TOO_LARGE sin modificar el envío', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', OVERSIZED_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('FILE_TOO_LARGE');
    expect(mockedEntregaService.confirmarEntrega).not.toHaveBeenCalled();
  });

  it('R24 - debe rechazar archivos que excedan 5MB (fallo) → 422 FILE_TOO_LARGE sin modificar el envío', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'Cliente ausente')
      .attach('foto', OVERSIZED_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('FILE_TOO_LARGE');
    expect(mockedEntregaService.registrarFallo).not.toHaveBeenCalled();
  });

  it('R25 - debe descartar archivos enviados con un nombre de campo distinto de foto/firma (confirmar) sin persistirlos', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' })
      .attach('documento', JPEG_BUFFER, { filename: 'extra.jpg', contentType: 'image/jpeg' });

    // El campo inesperado provoca que multer rechace la petición (LIMIT_UNEXPECTED_FILE)
    // → el archivo arbitrario nunca llega al servicio ni se persiste.
    expect(res.status).toBe(422);
    expect(mockedEntregaService.confirmarEntrega).not.toHaveBeenCalled();
  });

  it('R25 - debe descartar archivos enviados con un nombre de campo distinto de foto (fallo) sin persistirlos', async () => {
    const res = await request(app)
      .post('/api/v1/envios/envio-1/fallo')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .field('nota', 'Cliente ausente')
      .attach('adjuntoArbitrario', JPEG_BUFFER, {
        filename: 'arbitrario.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(422);
    expect(mockedEntregaService.registrarFallo).not.toHaveBeenCalled();
  });

  it('R25 - debe aceptar la confirmación cuando solo se envían los campos foto y firma esperados', async () => {
    mockedEntregaService.confirmarEntrega.mockResolvedValue(okResponse);

    const res = await request(app)
      .post('/api/v1/envios/envio-1/confirmar')
      .set('Authorization', `Bearer ${REPARTIDOR_TOKEN}`)
      .attach('foto', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('firma', PNG_BUFFER, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockedEntregaService.confirmarEntrega).toHaveBeenCalledTimes(1);
  });
});
