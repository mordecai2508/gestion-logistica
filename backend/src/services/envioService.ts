import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { envioRepository } from '../repositories/envioRepository';
import { clienteRepository } from '../repositories/clienteRepository';
import { AppError } from '../lib/appError';
import { notificacionService } from './notificacionService';
import {
  CrearEnvioDto,
  EnvioResponseDto,
  EnvioListItemDto,
  EnvioDetalleDto,
  EditarEnvioDto,
  PaginatedEnviosResponse,
  CancelarEnvioResponseDto,
  ReprogramarEnvioDto,
  ReprogramarEnvioResponseDto,
  MisEnviosItemDto,
} from '../types/envioTypes';
import type { ListarEnviosInput } from '../validators/envioValidator';
import type { ListarMisEnviosInput } from '../validators/clienteValidator';
import { rutaService } from './rutaService';

async function generarCodigoUnico(): Promise<string> {
  const INTENTOS_MAX = 3;
  for (let intento = 0; intento < INTENTOS_MAX; intento++) {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const parte = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8);
    const codigo = `TRK-${fecha}-${parte}`;
    const existente = await envioRepository.findByCodigo(codigo);
    if (existente === null) {
      return codigo;
    }
  }
  throw new AppError(
    'CODIGO_GENERATION_FAILED',
    'No se pudo generar un código de seguimiento único',
    500,
  );
}

export const envioService = {
  async crear(dto: CrearEnvioDto): Promise<EnvioResponseDto> {
    const cliente = await clienteRepository.findById(dto.clienteId);
    if (cliente === null) {
      throw new AppError('CLIENTE_NOT_FOUND', 'Cliente no encontrado', 404);
    }

    const codigoSeguimiento = await generarCodigoUnico();

    const envio = await envioRepository.createEnvio({ ...dto, codigoSeguimiento });

    await notificacionService.notificar({
      usuarioId: cliente.usuarioId,
      envioId: envio.id,
      mensaje: `Tu envío ${envio.codigoSeguimiento} fue registrado`,
      tipo: 'ENVIO_CREADO',
    });

    return {
      id: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
      remitente: envio.remitente,
      destinatario: envio.destinatario,
      direccionDestino: envio.direccionDestino,
      peso: envio.peso,
      dimensiones: envio.dimensiones,
      descripcion: envio.descripcion ?? null,
      clienteId: envio.clienteId,
      createdAt: envio.createdAt,
    };
  },

  async listar(query: ListarEnviosInput): Promise<PaginatedEnviosResponse> {
    const { page, limit, estado, cliente, codigo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EnvioWhereInput = {};
    if (estado !== undefined) {
      where.estado = estado;
    }
    if (codigo !== undefined) {
      where.codigoSeguimiento = { contains: codigo, mode: 'insensitive' };
    }
    if (cliente !== undefined) {
      where.cliente = { usuario: { nombre: { contains: cliente, mode: 'insensitive' } } };
    }

    const [envios, total] = await Promise.all([
      envioRepository.findMany(where, skip, limit),
      envioRepository.count(where),
    ]);

    const data: EnvioListItemDto[] = envios.map((e) => ({
      id: e.id,
      codigoSeguimiento: e.codigoSeguimiento,
      estado: e.estado,
      remitente: e.remitente,
      destinatario: e.destinatario,
      clienteId: e.clienteId,
      clienteNombre: e.cliente.usuario.nombre,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async obtenerDetalle(id: string): Promise<EnvioDetalleDto> {
    const envio = await envioRepository.findById(id);
    if (envio === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }

    return {
      id: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
      remitente: envio.remitente,
      destinatario: envio.destinatario,
      direccionDestino: envio.direccionDestino,
      peso: envio.peso,
      dimensiones: envio.dimensiones,
      descripcion: envio.descripcion ?? null,
      clienteId: envio.clienteId,
      rutaId: envio.rutaId ?? null,
      createdAt: envio.createdAt,
      updatedAt: envio.updatedAt,
      eventos: envio.eventos.map((ev) => ({
        id: ev.id,
        estado: ev.estado,
        descripcion: ev.descripcion,
        lat: ev.lat ?? null,
        lng: ev.lng ?? null,
        timestamp: ev.timestamp,
      })),
    };
  },

  async editar(id: string, dto: EditarEnvioDto): Promise<EnvioResponseDto> {
    const existente = await envioRepository.findById(id);
    if (existente === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }

    const envio = await envioRepository.update(id, dto);

    return {
      id: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
      remitente: envio.remitente,
      destinatario: envio.destinatario,
      direccionDestino: envio.direccionDestino,
      peso: envio.peso,
      dimensiones: envio.dimensiones,
      descripcion: envio.descripcion ?? null,
      clienteId: envio.clienteId,
      createdAt: envio.createdAt,
    };
  },

  async cancelar(id: string): Promise<CancelarEnvioResponseDto> {
    const existente = await envioRepository.findById(id);
    if (existente === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }
    if (existente.estado !== 'PENDIENTE') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'Solo se pueden cancelar envíos en estado PENDIENTE',
        409,
      );
    }

    const envio = await envioRepository.cancelar(id);

    // R22/R23: Check if route should be closed
    if (existente.rutaId !== null) {
      await rutaService.verificarCierreRuta(existente.rutaId);
    }

    return {
      id: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
    };
  },

  async listarMisEnvios(
    usuarioId: string,
    query: ListarMisEnviosInput,
  ): Promise<{ data: MisEnviosItemDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const cliente = await clienteRepository.findByUsuarioId(usuarioId);
    if (cliente === null) {
      throw new AppError(
        'CLIENTE_NOT_FOUND',
        'No existe perfil de cliente para este usuario',
        404,
      );
    }

    const { page, limit, estado } = query;
    const skip = (page - 1) * limit;

    const { envios, total } = await envioRepository.findManyByClienteId({
      clienteId: cliente.id,
      estado,
      skip,
      take: limit,
    });

    const data: MisEnviosItemDto[] = envios.map((e) => ({
      id: e.id,
      codigoSeguimiento: e.codigoSeguimiento,
      estado: e.estado,
      destinatario: e.destinatario,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async reprogramar(id: string, dto: ReprogramarEnvioDto): Promise<ReprogramarEnvioResponseDto> {
    const existente = await envioRepository.findById(id);
    if (existente === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }

    if (existente.estado === 'ENTREGADO' || existente.estado === 'CANCELADO') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'No se puede reprogramar un envío en estado terminal',
        409,
      );
    }

    const fechaIso = dto.fechaReprogramacion.toISOString();
    const descripcionEvento = `Entrega reprogramada para ${fechaIso}`;

    const envio = await envioRepository.reprogramar(id, {
      fechaReprogramacion: dto.fechaReprogramacion,
      descripcionEvento,
    });

    return {
      id: envio.id,
      codigoSeguimiento: envio.codigoSeguimiento,
      estado: envio.estado,
      fechaReprogramacion: (envio.fechaReprogramacion ?? dto.fechaReprogramacion).toISOString(),
    };
  },
};
