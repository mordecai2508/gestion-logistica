import { EstadoEnvio } from '@prisma/client';
import { entregaRepository } from '../repositories/entregaRepository';
import { rutaRepository } from '../repositories/rutaRepository';
import { AppError } from '../lib/appError';
import { guardarArchivo } from '../lib/uploadConfig';
import type { EnvioConRuta, EnvioConRutaYCliente } from '../repositories/entregaRepository';
import type {
  EntregaListItemDto,
  EntregasAgrupadasDto,
  ConfirmarEntregaResponseDto,
  RegistrarFalloResponseDto,
  ConfirmarEntregaInput,
  RegistrarFalloInput,
} from '../types/entregaTypes';
import { notificacionService } from './notificacionService';

const ESTADOS_PENDIENTES: EstadoEnvio[] = [
  'PENDIENTE',
  'EN_PREPARACION',
  'EN_TRANSITO',
  'EN_RUTA',
];

const ESTADOS_COMPLETADOS: EstadoEnvio[] = ['ENTREGADO', 'FALLIDO'];

const ESTADOS_TERMINALES: EstadoEnvio[] = ['ENTREGADO', 'CANCELADO', 'FALLIDO'];

/**
 * Resuelve el `Repartidor` asociado a un usuario autenticado con rol
 * REPARTIDOR. Se reutiliza `rutaRepository.findRepartidorByUsuarioId` (mismo
 * patrón que `resolverRepartidorPorUsuario` en `rutaService.ts`); se mantiene
 * el helper local —en lugar de extraerlo a un módulo compartido— para no
 * acoplar prematuramente ambos servicios mientras la lógica es idéntica y
 * trivial. Lanza 404 si el usuario no tiene perfil de repartidor.
 */
async function resolverRepartidorPorUsuario(usuarioId: string) {
  const repartidor = await rutaRepository.findRepartidorByUsuarioId(usuarioId);
  if (repartidor === null) {
    throw new AppError('REPARTIDOR_NOT_FOUND', 'Repartidor no encontrado', 404);
  }
  return repartidor;
}

function mapToListItem(envio: EnvioConRuta): EntregaListItemDto {
  return {
    id: envio.id,
    codigoSeguimiento: envio.codigoSeguimiento,
    estado: envio.estado,
    destinatario: envio.destinatario,
    direccionDestino: envio.direccionDestino,
    rutaId: envio.rutaId,
    updatedAt: envio.updatedAt.toISOString(),
  };
}

/**
 * Resuelve el repartidor, busca el envío y valida pertenencia y estado, de
 * forma común a confirmar/fallo. Devuelve el envío con sus relaciones.
 */
async function obtenerEnvioModificable(
  envioId: string,
  usuarioId: string,
): Promise<EnvioConRutaYCliente> {
  const repartidor = await resolverRepartidorPorUsuario(usuarioId);

  const envio = await entregaRepository.findEnvioConRutaYCliente(envioId);
  if (envio === null) {
    throw new AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404);
  }

  if (envio.ruta?.repartidorId !== repartidor.id) {
    throw new AppError(
      'FORBIDDEN',
      'El envío no está asignado a una ruta del repartidor',
      403,
    );
  }

  if (ESTADOS_TERMINALES.includes(envio.estado)) {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `No se puede modificar un envío en estado ${envio.estado}`,
      409,
    );
  }

  return envio;
}

export const entregaService = {
  async listarMisEntregas(usuarioId: string): Promise<EntregasAgrupadasDto> {
    const repartidor = await resolverRepartidorPorUsuario(usuarioId);

    const envios = await entregaRepository.findEnviosByRepartidorId(repartidor.id);

    const pendientes: EntregaListItemDto[] = [];
    const completadas: EntregaListItemDto[] = [];

    for (const envio of envios) {
      if (ESTADOS_PENDIENTES.includes(envio.estado)) {
        pendientes.push(mapToListItem(envio));
      } else if (ESTADOS_COMPLETADOS.includes(envio.estado)) {
        completadas.push(mapToListItem(envio));
      }
      // CANCELADO se excluye de ambos grupos.
    }

    return { pendientes, completadas };
  },

  async confirmarEntrega(
    envioId: string,
    usuarioId: string,
    archivos: ConfirmarEntregaInput,
  ): Promise<ConfirmarEntregaResponseDto> {
    const envio = await obtenerEnvioModificable(envioId, usuarioId);

    const evidenciaFoto = await guardarArchivo(envioId, 'foto', archivos.foto);
    const firma = await guardarArchivo(envioId, 'firma', archivos.firma);

    const { envio: actualizado, evento } = await entregaRepository.confirmarEntrega(
      envioId,
      {
        evidenciaFoto,
        firma,
        descripcionEvento: 'Entrega confirmada por el repartidor',
      },
    );

    await notificacionService.notificar({
      usuarioId: envio.cliente.usuarioId,
      envioId,
      mensaje: `Tu envío ${actualizado.codigoSeguimiento} fue entregado`,
      tipo: 'ENTREGA_REALIZADA',
    });

    return {
      id: actualizado.id,
      codigoSeguimiento: actualizado.codigoSeguimiento,
      estado: actualizado.estado,
      evidenciaFoto,
      firma,
      fechaEntrega: evento.timestamp.toISOString(),
    };
  },

  async registrarFallo(
    envioId: string,
    usuarioId: string,
    dto: RegistrarFalloInput,
  ): Promise<RegistrarFalloResponseDto> {
    const envio = await obtenerEnvioModificable(envioId, usuarioId);

    const fotoPath = dto.foto
      ? await guardarArchivo(envioId, 'foto', dto.foto)
      : null;

    const { envio: actualizado, incidencia } = await entregaRepository.registrarFallo(
      envioId,
      { nota: dto.nota, foto: fotoPath },
    );

    await notificacionService.notificar({
      usuarioId: envio.cliente.usuarioId,
      envioId,
      mensaje: `No fue posible entregar tu envío ${actualizado.codigoSeguimiento}: ${dto.nota}`,
      tipo: 'CAMBIO_ESTADO',
    });

    await notificacionService.notificar({
      usuarioId: envio.cliente.usuarioId,
      envioId,
      mensaje: `Se reportó una incidencia en tu envío ${actualizado.codigoSeguimiento}: ENTREGA_FALLIDA`,
      tipo: 'INCIDENCIA_REPORTADA',
    });

    return {
      id: actualizado.id,
      codigoSeguimiento: actualizado.codigoSeguimiento,
      estado: actualizado.estado,
      incidenciaId: incidencia.id,
    };
  },
};
