import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu } from '../ProfileMenu';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockLogout = vi.fn();
vi.mock('@/services/authService', () => ({
  authService: {
    logout: () => mockLogout(),
  },
}));

const mockClearAuth = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { clearAuth: () => void }) => unknown) =>
    selector({ clearAuth: mockClearAuth }),
}));

function renderMenu(userName = 'Ana Torres') {
  return render(
    <MemoryRouter>
      <ProfileMenu userName={userName} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLogout.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────
// R23 — Cerrar sesión clears auth and redirects to /login
// ─────────────────────────────────────────────────────────────────

describe('R23 — ProfileMenu: "Cerrar sesión" limpia auth y redirige a /login', () => {
  it('muestra el nombre del usuario como trigger del menú', () => {
    renderMenu('Carlos Pérez');

    expect(screen.getByRole('button', { name: 'Menú de perfil' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument();
  });

  it('abre el dropdown al hacer clic en el trigger', () => {
    renderMenu();

    expect(screen.queryByRole('menuitem', { name: 'Ver perfil' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Menú de perfil' }));

    expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('navega a /perfil al hacer clic en "Ver perfil"', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Menú de perfil' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ver perfil' }));

    expect(mockNavigate).toHaveBeenCalledWith('/perfil');
  });

  it('llama a authService.logout, clearAuth y navega a /login al hacer clic en "Cerrar sesión"', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Menú de perfil' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('llama a clearAuth y navega a /login incluso si authService.logout falla', async () => {
    mockLogout.mockRejectedValue(new Error('Network error'));

    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Menú de perfil' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
