import api from './api';
import type {
  UsuarioDto,
  ListaUsuariosDto,
  ListarUsuariosFiltros,
  ActualizarEstadoUsuarioInput,
} from '@/types/usuarioTypes';

export const usuarioService = {
  async listar(params: ListarUsuariosFiltros = {}): Promise<ListaUsuariosDto> {
    const query: Record<string, string | number> = {};
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.rol !== undefined) query.rol = params.rol;

    const res = await api.get<{ data: UsuarioDto[]; meta: ListaUsuariosDto['meta']; message: string; status: number }>(
      '/usuarios',
      { params: query },
    );
    return { data: res.data.data, meta: res.data.meta };
  },

  async obtenerPorId(id: string): Promise<UsuarioDto> {
    const res = await api.get<{ data: UsuarioDto; message: string; status: number }>(
      `/usuarios/${id}`,
    );
    return res.data.data;
  },

  async actualizarEstado(id: string, dto: ActualizarEstadoUsuarioInput): Promise<UsuarioDto> {
    const res = await api.patch<{ data: UsuarioDto; message: string; status: number }>(
      `/usuarios/${id}/estado`,
      dto,
    );
    return res.data.data;
  },
};
