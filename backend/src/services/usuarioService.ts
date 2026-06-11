import { usuarioRepository, UsuarioSeleccionado } from '../repositories/usuarioRepository';
import { AppError } from '../lib/appError';
import type {
  UsuarioDto,
  ListaUsuariosResponse,
  ListarUsuariosInput,
  ActualizarEstadoUsuarioDto,
} from '../types/usuarioTypes';

function mapToDto(usuario: UsuarioSeleccionado): UsuarioDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    telefono: usuario.telefono,
    activo: usuario.activo,
    createdAt: usuario.createdAt.toISOString(),
  };
}

export const usuarioService = {
  async listar(query: ListarUsuariosInput): Promise<ListaUsuariosResponse> {
    const { page, limit, rol } = query;
    const skip = (page - 1) * limit;

    const { usuarios, total } = await usuarioRepository.findAll({ rol }, skip, limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: usuarios.map(mapToDto),
      meta: { total, page, limit, totalPages },
    };
  },

  async obtenerPorId(id: string): Promise<UsuarioDto> {
    const usuario = await usuarioRepository.findById(id);
    if (usuario === null) {
      throw new AppError('NOT_FOUND', 'Usuario no encontrado', 404);
    }
    return mapToDto(usuario);
  },

  async actualizarEstado(
    id: string,
    dto: ActualizarEstadoUsuarioDto,
    operadorId: string,
  ): Promise<UsuarioDto> {
    if (id === operadorId) {
      throw new AppError(
        'CANNOT_DEACTIVATE_SELF',
        'No puedes desactivar tu propia cuenta',
        409,
      );
    }

    const existente = await usuarioRepository.findById(id);
    if (existente === null) {
      throw new AppError('NOT_FOUND', 'Usuario no encontrado', 404);
    }

    const actualizado = await usuarioRepository.actualizarEstado(id, dto.activo);
    return mapToDto(actualizado);
  },
};
