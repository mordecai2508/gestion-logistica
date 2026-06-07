import crypto from 'crypto';
import { EstadoRuta } from '@prisma/client';
import { rutaRepository } from '../repositories/rutaRepository';
import { AppError } from '../lib/appError';
import {
  CrearRutaDto,
  ReasignarRutaDto,
  RutaResponseDto,
  RutaOptimaResponseDto,
  EnvioOrdenadoDto,
  PaginatedRutasResponse,
  RutaFilters,
} from '../types/rutaTypes';
import type { RutaConRelaciones } from '../repositories/rutaRepository';

async function generarCodigoRuta(): Promise<string> {
  const INTENTOS_MAX = 3;
  for (let intento = 0; intento < INTENTOS_MAX; intento++) {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const parte = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
    const codigo = `RUTA-${fecha}-${parte}`;
    const existente = await rutaRepository.findByCodigo(codigo);
    if (existente === null) {
      return codigo;
    }
  }
  throw new AppError(
    'CODIGO_GENERATION_FAILED',
    'No se pudo generar un código de ruta único',
    500,
  );
}

function mapRutaToDto(ruta: RutaConRelaciones): RutaResponseDto {
  return {
    id: ruta.id,
    codigo: ruta.codigo,
    estado: ruta.estado,
    createdAt: ruta.createdAt,
    updatedAt: ruta.updatedAt,
    vehiculo: {
      id: ruta.vehiculo.id,
      placa: ruta.vehiculo.placa,
      modelo: ruta.vehiculo.modelo,
      capacidad: ruta.vehiculo.capacidad,
      estado: ruta.vehiculo.estado,
    },
    repartidor: {
      id: ruta.repartidor.id,
      usuario: {
        nombre: ruta.repartidor.usuario.nombre,
        correo: ruta.repartidor.usuario.correo,
      },
      licencia: ruta.repartidor.licencia,
      disponible: ruta.repartidor.disponible,
    },
    envios: ruta.envios.map((e) => ({
      id: e.id,
      codigoSeguimiento: e.codigoSeguimiento,
      estado: e.estado,
      direccionDestino: e.direccionDestino,
      lat: e.lat,
      lng: e.lng,
    })),
  };
}

function euclideanDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
}

/**
 * Resuelve el id de `Repartidor` asociado a un usuario autenticado con rol
 * REPARTIDOR. Lanza si el usuario no tiene un perfil de repartidor asociado.
 */
async function resolverRepartidorPorUsuario(usuarioId: string) {
  const repartidor = await rutaRepository.findRepartidorByUsuarioId(usuarioId);
  if (repartidor === null) {
    throw new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404);
  }
  return repartidor;
}

export const rutaService = {
  async crear(dto: CrearRutaDto): Promise<RutaResponseDto> {
    // 1. Validate envios exist, are PENDIENTE, and not assigned to another route
    const envios = await rutaRepository.findEnviosByIds(dto.enviosIds);

    if (envios.length !== dto.enviosIds.length) {
      const foundIds = envios.map((e) => e.id);
      const missing = dto.enviosIds.filter((id) => !foundIds.includes(id));
      throw new AppError(
        'ENVIO_NOT_FOUND',
        `Envíos no encontrados: ${missing.join(', ')}`,
        404,
      );
    }

    for (const envio of envios) {
      if (envio.estado !== 'PENDIENTE') {
        throw new AppError(
          'ENVIO_INVALID_STATE',
          `El envío ${envio.codigoSeguimiento} no está en estado PENDIENTE`,
          422,
        );
      }
      if (envio.rutaId !== null) {
        throw new AppError(
          'ENVIO_ALREADY_ASSIGNED',
          `El envío ${envio.codigoSeguimiento} ya está asignado a otra ruta`,
          422,
        );
      }
    }

    // 2. Validate vehicle
    const vehiculo = await rutaRepository.findVehiculoById(dto.vehiculoId);
    if (vehiculo === null) {
      throw new AppError('VEHICULO_NOT_FOUND', 'Vehículo no encontrado', 404);
    }
    if (vehiculo.estado !== 'DISPONIBLE') {
      throw new AppError(
        'VEHICULO_NOT_AVAILABLE',
        'El vehículo no está disponible',
        422,
      );
    }

    // 3. Validate delivery person
    const repartidor = await rutaRepository.findRepartidorById(dto.repartidorId);
    if (repartidor === null) {
      throw new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404);
    }
    if (!repartidor.disponible) {
      throw new AppError(
        'REPARTIDOR_NOT_AVAILABLE',
        'El repartidor no está disponible',
        422,
      );
    }

    // 4. Generate unique route code
    const codigo = await generarCodigoRuta();

    // 5. Create route, assign envios and update vehicle status — all in one transaction
    const ruta = await rutaRepository.crearConTransaccion({
      codigo,
      repartidorId: dto.repartidorId,
      vehiculoId: dto.vehiculoId,
      enviosIds: dto.enviosIds,
    });

    return mapRutaToDto(ruta);
  },

  async listar(
    filters: RutaFilters,
    usuarioId: string,
    rol: string,
  ): Promise<PaginatedRutasResponse> {
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const repoFilters: { repartidorId?: string } = {};

    if (rol === 'REPARTIDOR') {
      // Repartidor can only see their own routes
      const repartidor = await resolverRepartidorPorUsuario(usuarioId);
      repoFilters.repartidorId = repartidor.id;
    } else if (filters.repartidorId === 'me') {
      // Operator using repartidorId=me filter
      const repartidor = await rutaRepository.findRepartidorByUsuarioId(usuarioId);
      if (repartidor !== null) {
        repoFilters.repartidorId = repartidor.id;
      }
    } else if (filters.repartidorId !== undefined) {
      repoFilters.repartidorId = filters.repartidorId;
    }

    const { rutas, total } = await rutaRepository.findAll(repoFilters, skip, limit);

    return {
      data: rutas.map(mapRutaToDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async obtenerDetalle(id: string, usuarioId: string, rol: string): Promise<RutaResponseDto> {
    const ruta = await rutaRepository.findById(id);
    if (ruta === null) {
      throw new AppError('RUTA_NOT_FOUND', 'Ruta no encontrada', 404);
    }

    if (rol === 'REPARTIDOR') {
      const repartidor = await rutaRepository.findRepartidorByUsuarioId(usuarioId);
      if (repartidor === null || ruta.repartidorId !== repartidor.id) {
        throw new AppError('FORBIDDEN', 'No tienes acceso a esta ruta', 403);
      }
    }

    return mapRutaToDto(ruta);
  },

  async reasignar(id: string, dto: ReasignarRutaDto): Promise<RutaResponseDto> {
    // 1. Verify route exists and is not completed/cancelled
    const ruta = await rutaRepository.findById(id);
    if (ruta === null) {
      throw new AppError('RUTA_NOT_FOUND', 'Ruta no encontrada', 404);
    }
    if (ruta.estado === EstadoRuta.COMPLETADA || ruta.estado === EstadoRuta.CANCELADA) {
      throw new AppError(
        'RUTA_INVALID_STATE',
        'No se puede reasignar una ruta completada o cancelada',
        422,
      );
    }

    // 2. Validate new repartidor if provided
    if (dto.repartidorId !== undefined) {
      const nuevoRepartidor = await rutaRepository.findRepartidorById(dto.repartidorId);
      if (nuevoRepartidor === null) {
        throw new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404);
      }
      if (!nuevoRepartidor.disponible) {
        throw new AppError(
          'REPARTIDOR_NOT_AVAILABLE',
          'El repartidor no está disponible',
          422,
        );
      }
    }

    // 3. Validate new vehicle if provided
    if (dto.vehiculoId !== undefined) {
      const nuevoVehiculo = await rutaRepository.findVehiculoById(dto.vehiculoId);
      if (nuevoVehiculo === null) {
        throw new AppError('VEHICULO_NOT_FOUND', 'Vehículo no encontrado', 404);
      }
      if (nuevoVehiculo.estado !== 'DISPONIBLE') {
        throw new AppError(
          'VEHICULO_NOT_AVAILABLE',
          'El vehículo no está disponible',
          422,
        );
      }
    }

    // 4. Apply the reassignment (and vehicle status transitions) in one transaction
    const rutaActualizada = await rutaRepository.reasignarConTransaccion({
      rutaId: id,
      repartidorId: dto.repartidorId,
      vehiculoId: dto.vehiculoId,
      vehiculoAnteriorId: ruta.vehiculoId,
    });

    return mapRutaToDto(rutaActualizada);
  },

  async calcularOptima(id: string): Promise<RutaOptimaResponseDto> {
    const ruta = await rutaRepository.findById(id);
    if (ruta === null) {
      throw new AppError('RUTA_NOT_FOUND', 'Ruta no encontrada', 404);
    }

    const envios = ruta.envios;

    // R20: If only one shipment, return it directly
    if (envios.length <= 1) {
      return {
        paradas: envios.map((e, idx) => ({
          orden: idx + 1,
          envioId: e.id,
          codigoSeguimiento: e.codigoSeguimiento,
          direccionDestino: e.direccionDestino,
          lat: e.lat,
          lng: e.lng,
        })),
      };
    }

    // R21: Check if any shipment is missing coordinates
    const tieneCoordenadasIncompletas = envios.some((e) => e.lat === null || e.lng === null);
    if (tieneCoordenadasIncompletas) {
      return {
        paradas: envios.map((e, idx) => ({
          orden: idx + 1,
          envioId: e.id,
          codigoSeguimiento: e.codigoSeguimiento,
          direccionDestino: e.direccionDestino,
          lat: e.lat,
          lng: e.lng,
        })),
        advertencia: 'Las coordenadas de uno o más envíos no están disponibles. Las paradas se muestran en orden de asignación.',
      };
    }

    // R19: Nearest neighbor heuristic
    const pendientes = [...envios];
    const ordenados: typeof envios = [];
    let actual = pendientes.splice(0, 1)[0];
    ordenados.push(actual);

    while (pendientes.length > 0) {
      let masCercanoIndice = -1;
      let menorDistancia = Infinity;

      for (let i = 0; i < pendientes.length; i++) {
        const candidato = pendientes[i];
        const dist = euclideanDistance(
          actual.lat!,
          actual.lng!,
          candidato.lat!,
          candidato.lng!,
        );
        if (dist < menorDistancia) {
          menorDistancia = dist;
          masCercanoIndice = i;
        }
      }

      actual = pendientes.splice(masCercanoIndice, 1)[0];
      ordenados.push(actual);
    }

    const paradas: EnvioOrdenadoDto[] = ordenados.map((e, idx) => ({
      orden: idx + 1,
      envioId: e.id,
      codigoSeguimiento: e.codigoSeguimiento,
      direccionDestino: e.direccionDestino,
      lat: e.lat,
      lng: e.lng,
    }));

    return { paradas };
  },

  /**
   * R22/R23 — Verifica si todos los envíos de una ruta alcanzaron un estado
   * terminal (ENTREGADO o CANCELADO); si es así, marca la ruta como
   * COMPLETADA y libera el vehículo asignado (estado DISPONIBLE).
   *
   * NOTA DE ALCANCE: esta función es invocada hoy únicamente desde
   * `envioService.cancelar`, que sólo permite cancelar envíos en estado
   * PENDIENTE — y un envío asignado a una ruta nunca está en PENDIENTE
   * (pasa a EN_RUTA al crearse la ruta). Por lo tanto, en el sistema actual
   * esta función nunca recibe una ruta cuyos envíos estén todos en estado
   * terminal por esa vía. La transición real a ENTREGADO la introducirá la
   * feature `entregas_confirmacion` (id 9, status `pending`); cuando esa
   * feature integre `verificarCierreRuta` en su flujo de confirmación de
   * entrega, R22/R23 quedarán verificables de extremo a extremo. Mientras
   * tanto, esta función se mantiene y se prueba de forma aislada y real
   * (ver `rutas.test.ts`, sección R22/R23) para no dejar código sin probar
   * y para que la integración futura sólo tenga que invocarla.
   */
  async verificarCierreRuta(rutaId: string): Promise<void> {
    const ruta = await rutaRepository.findById(rutaId);
    if (ruta === null) return;

    if (ruta.estado === EstadoRuta.COMPLETADA || ruta.estado === EstadoRuta.CANCELADA) {
      return;
    }

    const todosTerminales = ruta.envios.every(
      (e) => e.estado === 'ENTREGADO' || e.estado === 'CANCELADO',
    );

    if (todosTerminales && ruta.envios.length > 0) {
      await rutaRepository.cerrarRutaConTransaccion(rutaId, ruta.vehiculoId);
    }
  },
};
