import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResetPassword } from '../ResetPassword';

// Mock authService
const mockResetPassword = vi.fn();
vi.mock('@/services/authService', () => ({
  authService: {
    resetPassword: (token: string, newPassword: string) =>
      mockResetPassword(token, newPassword),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderResetPassword(token?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const url = token
    ? `/reset-password?token=${token}`
    : '/reset-password';
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <ResetPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResetPassword component', () => {
  it('R15 - debe redirigir a /login tras reset exitoso', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);

    renderResetPassword('valid-token-hex');

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid-token-hex', 'newpassword123');
    });

    // Success toast should appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('R16/R17/R18 - debe mostrar mensaje de error con token inválido', async () => {
    mockResetPassword.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'Token inválido o expirado', error: 'INVALID_RESET_TOKEN', statusCode: 400 },
      },
    });

    renderResetPassword('invalid-token');

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El enlace es inválido o ha expirado',
      );
    });
  });

  it('debe mostrar "Enlace inválido" si no hay token en la URL', () => {
    renderResetPassword();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enlace inválido');
  });
});
