import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import type { LoginDto, RegisterDto } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const ROLE_ROUTES: Record<string, string> = {
  OPERADOR: '/dashboard',
  REPARTIDOR: '/repartidor',
  CLIENTE: '/tracking',
};

export function useAuth() {
  const navigate = useNavigate();
  const { setAuth, clearAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      setAuth(user, accessToken);
      const route = ROLE_ROUTES[user.rol] ?? '/dashboard';
      navigate(route, { replace: true });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
    onError: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (dto: RegisterDto) => authService.register(dto),
    onSuccess: () => {
      navigate('/login', { replace: true });
    },
  });

  return { loginMutation, logoutMutation, registerMutation };
}
