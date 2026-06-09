import { repartidorRepository, RepartidorConUsuario } from '../repositories/repartidorRepository';
import { AppError } from '../lib/appError';
import type {
  RepartidorDto,
  RepartidorDetalleDto,
  ListaRepartidoresResponse,
  ActualizarRepartidorDto,
  ListarRepartidoresInput,
} from '../types/repartidorTypes';

function mapToDto(repartidor: RepartidorConUsuario): RepartidorDto {
  return {
    id: repartidor.id,
    licencia: repartidor.licencia,
    disponible: repartidor.disponible,
    usuario: {
      id: repartidor.usuario.id,
      nombre: repartidor.usuario.nombre,
      correo: repartidor.usuario.correo,
      telefono: repartidor.usuario.telefono,
    },
  };
}

export const repartidorService = {
  async listar(query: ListarRepartidoresInput): Promise<ListaRepartidoresResponse> {
    const { page, limit, disponible } = query;
    const skip = (page - 1) * limit;

    const { repartidores, total } = await repartidorRepository.findAll(
      { disponible },
      skip,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: repartidores.map(mapToDto),
      meta: { total, page, limit, totalPages },
    };
  },

  async obtenerPorId(id: string): Promise<RepartidorDetalleDto> {
    const repartidor = await repartidorRepository.findById(id);
    if (repartidor === null) {
      throw new AppError('NOT_FOUND', 'Repartidor no encontrado', 404);
    }
    return mapToDto(repartidor);
  },

  async actualizar(id: string, dto: ActualizarRepartidorDto): Promise<RepartidorDetalleDto> {
    const existente = await repartidorRepository.findById(id);
    if (existente === null) {
      throw new AppError('NOT_FOUND', 'Repartidor no encontrado', 404);
    }

    const actualizado = await repartidorRepository.update(id, dto);
    return mapToDto(actualizado);
  },
};
