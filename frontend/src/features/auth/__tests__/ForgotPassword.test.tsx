import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForgotPassword } from '../ForgotPassword';

// Mock authService
const mockForgotPassword = vi.fn();
vi.mock('@/services/authService', () => ({
  authService: {
    forgotPassword: (correo: string) => mockForgotPassword(correo),
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

function renderForgotPassword() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPassword component', () => {
  it('R10 - debe mostrar mensaje de confirmación tras submit', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    renderForgotPassword();

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Si el correo existe recibirás un enlace de recuperación',
      );
    });
  });

  it('R10 - debe mostrar confirmación incluso cuando el correo no existe', async () => {
    // R10: always returns 200 regardless of email existence
    mockForgotPassword.mockResolvedValueOnce(undefined);

    renderForgotPassword();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'noexiste@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    expect(mockForgotPassword).toHaveBeenCalledWith('noexiste@example.com');
  });

  it('debe mostrar enlace de volver al login', () => {
    renderForgotPassword();
    expect(screen.getByLabelText('Volver al login')).toBeInTheDocument();
  });
});
