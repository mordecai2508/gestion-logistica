import { Prisma, EstadoIncidencia } from '@prisma/client';
import { incidenciaRepository } from '../repositories/incidenciaRepository';
import { envioRepository } from '../repositories/envioRepository';
import { AppError } from '../lib/appError';
import {
  CrearIncidenciaDto,
  IncidenciaDto,
  IncidenciaListItemDto,
  PaginatedIncidenciasResponse,
} from '../types/incidenciaTypes';
import type { ListarIncidenciasInput } from '../validators/incidenciaValidator';

function proyectarIncidencia(incidencia: {
  id: string;
  tipo: IncidenciaDto['tipo'];
  descripcion: string;
  estado: IncidenciaDto['estado'];
  foto: string | null;
  nota: string | null;
  envioId: string;
  createdAt: Date;
  updatedAt: Date;
}): IncidenciaDto {
  return {
    id: incidencia.id,
    tipo: incidencia.tipo,
    descripcion: incidencia.descripcion,
    estado: incidencia.estado,
    foto: incidencia.foto ?? null,
    nota: incidencia.nota ?? null,
    envioId: incidencia.envioId,
    createdAt: incidencia.createdAt,
    updatedAt: incidencia.updatedAt,
  };
}

export const incidenciaService = {
  async crear(dto: CrearIncidenciaDto): Promise<IncidenciaDto> {
    const envio = await envioRepository.findById(dto.envioId);
    if (envio === null) {
      throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
    }

    const incidencia = await incidenciaRepository.crear(dto);

    return proyectarIncidencia(incidencia);
  },

  async listar(query: ListarIncidenciasInput): Promise<PaginatedIncidenciasResponse> {
    const { page, limit, tipo, estado } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IncidenciaWhereInput = {};
    if (tipo !== undefined) {
      where.tipo = tipo;
    }
    if (estado !== undefined) {
      where.estado = estado;
    }

    const [incidencias, total] = await Promise.all([
      incidenciaRepository.findMany(where, skip, limit),
      incidenciaRepository.count(where),
    ]);

    const data: IncidenciaListItemDto[] = incidencias.map((i) => ({
      id: i.id,
      tipo: i.tipo,
      descripcion: i.descripcion,
      estado: i.estado,
      envioId: i.envioId,
      envioCodigoSeguimiento: i.envio.codigoSeguimiento,
      createdAt: i.createdAt,
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

  async actualizarEstado(id: string, nuevoEstado: EstadoIncidencia): Promise<IncidenciaDto> {
    const incidencia = await incidenciaRepository.findById(id);
    if (incidencia === null) {
      throw new AppError('INCIDENCIA_NOT_FOUND', 'Incidencia no encontrada', 404);
    }

    if (nuevoEstado === incidencia.estado) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'La incidencia ya se encuentra en ese estado',
        409,
      );
    }

    if (incidencia.estado === 'RESUELTA') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'No se puede reabrir una incidencia resuelta',
        409,
      );
    }

    const actualizada = await incidenciaRepository.actualizarEstado(id, nuevoEstado);

    return proyectarIncidencia(actualizada);
  },
};
