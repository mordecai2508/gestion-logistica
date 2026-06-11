import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Perfil } from './Perfil';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockLogout = vi.fn();
vi.mock('@/services/authService', () => ({
  authService: {
    logout: (...args: unknown[]) => mockLogout(...args),
  },
}));

const mockClearAuth = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { clearAuth: () => void }) => unknown) =>
    selector({ clearAuth: mockClearAuth }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUpdateMutateAsync = vi.fn();
vi.mock('@/hooks/usePerfil', () => ({
  usePerfil: () => ({
    data: { nombre: 'Juan Pérez', correo: 'juan@test.com', telefono: '3001234567', rol: 'REPARTIDOR' },
    isPending: false,
  }),
}));

vi.mock('@/hooks/useUpdatePerfil', () => ({
  useUpdatePerfil: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/perfil']}>{ui}</MemoryRouter>);
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Perfil', () => {
  it('R24 - debe invocar logout, limpiar el authStore y navegar a /login al hacer clic en "Cerrar sesión"', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    renderWithProviders(<Perfil />);

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('R18 - debe limpiar el authStore y navegar a /login incluso si la llamada de logout falla', async () => {
    mockLogout.mockRejectedValueOnce(new Error('network error'));

    renderWithProviders(<Perfil />);

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
