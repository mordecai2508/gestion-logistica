import { Rol } from '@prisma/client';

export interface PerfilDto {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: Rol;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePerfilInput {
  nombre?: string;
  telefono?: string;
}

export interface CreatePasswordResetTokenInput {
  token: string;
  usuarioId: string;
  expiresAt: Date;
}
