import api from './api';
import type { PerfilDto, UpdatePerfilInput } from '@/types/userTypes';

export const userService = {
  async getPerfil(): Promise<PerfilDto> {
    const res = await api.get<{ data: PerfilDto; message: string; status: number }>(
      '/users/me',
    );
    return res.data.data;
  },

  async updatePerfil(dto: UpdatePerfilInput): Promise<PerfilDto> {
    const res = await api.patch<{ data: PerfilDto; message: string; status: number }>(
      '/users/me',
      dto,
    );
    return res.data.data;
  },
};
