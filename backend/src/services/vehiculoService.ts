import { Vehiculo, EstadoVehiculo } from '@prisma/client';
import { vehiculoRepository } from '../repositories/vehiculoRepository';
import { AppError } from '../lib/appError';
import {
  CrearVehiculoDto,
  ListarVehiculosFiltros,
  VehiculoResponseDto,
} from '../types/vehiculoTypes';

function mapVehiculoToDto(vehiculo: Vehiculo): VehiculoResponseDto {
  return {
    id: vehiculo.id,
    placa: vehiculo.placa,
    modelo: vehiculo.modelo,
    capacidad: vehiculo.capacidad,
    estado: vehiculo.estado,
    createdAt: vehiculo.createdAt,
    updatedAt: vehiculo.updatedAt,
  };
}

/**
 * Estados a los que un vehículo EN_RUTA no puede transicionar directamente:
 * primero debe desvincularse de su ruta activa (ver design.md sección 3.3).
 */
const ESTADOS_BLOQUEADOS_DESDE_EN_RUTA: EstadoVehiculo[] = ['MANTENIMIENTO', 'FUERA_SERVICIO'];

export const vehiculoService = {
  async crear(dto: CrearVehiculoDto): Promise<VehiculoResponseDto> {
    const existente = await vehiculoRepository.findByPlaca(dto.placa);
    if (existente !== null) {
      throw new AppError('PLACA_DUPLICADA', 'La placa ya está registrada', 409);
    }

    const vehiculo = await vehiculoRepository.crear({
      placa: dto.placa,
      modelo: dto.modelo,
      capacidad: dto.capacidad,
    });

    return mapVehiculoToDto(vehiculo);
  },

  async listar(filtros: ListarVehiculosFiltros): Promise<VehiculoResponseDto[]> {
    const vehiculos = await vehiculoRepository.findAll(filtros);
    return vehiculos.map(mapVehiculoToDto);
  },

  async actualizarEstado(id: string, nuevoEstado: EstadoVehiculo): Promise<VehiculoResponseDto> {
    const vehiculo = await vehiculoRepository.findById(id);
    if (vehiculo === null) {
      throw new AppError('VEHICULO_NOT_FOUND', 'Vehículo no encontrado', 404);
    }

    if (
      vehiculo.estado === 'EN_RUTA' &&
      ESTADOS_BLOQUEADOS_DESDE_EN_RUTA.includes(nuevoEstado)
    ) {
      throw new AppError(
        'VEHICULO_EN_RUTA_ACTIVA',
        'El vehículo está asignado a una ruta activa; debe desvincularse de ella antes de cambiar su estado',
        422,
      );
    }

    const actualizado = await vehiculoRepository.actualizarEstado(id, nuevoEstado);
    return mapVehiculoToDto(actualizado);
  },
};
