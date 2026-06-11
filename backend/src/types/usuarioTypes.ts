import type { Rol } from '@prisma/client';

export interface UsuarioDto {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
  createdAt: string; // ISO 8601
}

export interface ListaUsuariosResponse {
  data: UsuarioDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarUsuariosInput {
  page: number;
  limit: number;
  rol?: Rol;
}

export interface ActualizarEstadoUsuarioDto {
  activo: boolean;
}
