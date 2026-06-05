import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Rol = 'CLIENTE' | 'OPERADOR' | 'REPARTIDOR';

export interface AuthUser {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => set({ user, accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    { name: 'auth-storage' },
  ),
);
