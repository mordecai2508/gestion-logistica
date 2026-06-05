import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

type Rol = 'CLIENTE' | 'OPERADOR' | 'REPARTIDOR';

const ROLE_BASE_ROUTES: Record<Rol, string> = {
  OPERADOR: '/dashboard',
  REPARTIDOR: '/repartidor',
  CLIENTE: '/tracking',
};

interface ProtectedRouteProps {
  allowedRoles?: Rol[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol as Rol)) {
    const baseRoute = ROLE_BASE_ROUTES[user.rol as Rol] ?? '/login';
    return <Navigate to={baseRoute} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
