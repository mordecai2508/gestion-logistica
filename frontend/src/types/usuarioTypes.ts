export type Rol = 'CLIENTE' | 'OPERADOR' | 'REPARTIDOR';

export interface UsuarioDto {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export interface UsuarioMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListaUsuariosDto {
  data: UsuarioDto[];
  meta: UsuarioMeta;
}

export interface ListarUsuariosFiltros {
  page?: number;
  limit?: number;
  rol?: Rol;
}

export interface ActualizarEstadoUsuarioInput {
  activo: boolean;
}
