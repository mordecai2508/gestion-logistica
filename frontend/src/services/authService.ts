import api from './api';
import type { AuthUser } from '@/store/authStore';

export type Rol = 'CLIENTE' | 'OPERADOR' | 'REPARTIDOR';

export interface LoginDto {
  correo: string;
  password: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: AuthUser;
  };
  message: string;
  status: number;
}

export interface RegisterDto {
  nombre: string;
  correo: string;
  password: string;
  confirmPassword: string;
  telefono: string;
  rol: Rol;
}

export interface RegisterResponse {
  data: {
    id: string;
    correo: string;
    rol: Rol;
  };
  message: string;
  status: number;
}

export const authService = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', dto);
    return res.data;
  },

  async refresh(): Promise<{ accessToken: string }> {
    const res = await api.post<{ data: { accessToken: string }; message: string; status: number }>(
      '/auth/refresh',
    );
    return { accessToken: res.data.data.accessToken };
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async register(dto: RegisterDto): Promise<{ id: string; correo: string; rol: string }> {
    const res = await api.post<RegisterResponse>('/auth/register', dto);
    return res.data.data;
  },

  async forgotPassword(correo: string): Promise<void> {
    await api.post('/auth/forgot-password', { correo });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  },
};
