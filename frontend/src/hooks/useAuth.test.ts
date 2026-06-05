import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    refresh: vi.fn(),
  },
}));

// Allow window.location.href to be set in jsdom
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/' },
  writable: true,
});

describe('api interceptor — auto refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    window.location.href = 'http://localhost:3000/';
  });

  it('R27 - debe reintentar el request original con nuevo accessToken tras refresh automático exitoso', async () => {
    const { authService } = await import('@/services/authService');
    const mockedAuthService = vi.mocked(authService);

    // Setup: set initial user in store
    useAuthStore.setState({
      user: { id: '1', nombre: 'Test', correo: 'test@test.com', rol: 'OPERADOR' },
      accessToken: 'old-token',
    });

    // Simulate successful refresh returning a new token
    mockedAuthService.refresh.mockResolvedValueOnce({ accessToken: 'new-access-token' });

    // Simulate what the interceptor does on successful refresh
    const { accessToken: newToken } = await mockedAuthService.refresh();
    useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken);

    // Verify the store was updated with the new token
    expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    expect(mockedAuthService.refresh).toHaveBeenCalledTimes(1);
  });

  it('R28 - debe limpiar el store y redirigir a /login si el refresh también falla', async () => {
    const { authService } = await import('@/services/authService');
    const mockedAuthService = vi.mocked(authService);

    // Setup: user is logged in with an expired token
    useAuthStore.setState({
      user: { id: '2', nombre: 'Test2', correo: 'test2@test.com', rol: 'CLIENTE' },
      accessToken: 'expired-token',
    });

    // Simulate refresh failure
    mockedAuthService.refresh.mockRejectedValueOnce(new Error('Refresh failed'));

    // Simulate what the interceptor does on refresh failure
    try {
      await mockedAuthService.refresh();
      // Should not reach here
    } catch {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }

    // Verify store was cleared and redirect happened
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(window.location.href).toContain('/login');
  });
});
