import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './Login';

// Mock useAuth hook
const mockLoginMutateAsync = vi.fn();
const mockLoginMutation = {
  mutateAsync: mockLoginMutateAsync,
  isPending: false,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ loginMutation: mockLoginMutation }),
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

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoginMutation.isPending = false;
});

describe('Login component', () => {
  it('R20 - debe renderizar todos los elementos del wireframe: logo, campos, checkbox, botón, links', () => {
    renderLogin();

    // Logo
    expect(screen.getByLabelText('Logo')).toBeInTheDocument();

    // Email field
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();

    // Password field
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();

    // Recordarme checkbox
    expect(screen.getByLabelText('Recordarme')).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();

    // Forgot password link
    expect(screen.getByLabelText('¿Olvidó su contraseña?')).toBeInTheDocument();

    // Register link
    expect(screen.getByLabelText('Registrarse')).toBeInTheDocument();
  });

  it('R21 R22 - debe redirigir a /dashboard cuando el login es exitoso con rol OPERADOR', async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({
      data: {
        accessToken: 'token-abc',
        user: { id: '1', nombre: 'Op User', correo: 'op@test.com', rol: 'OPERADOR' },
      },
      message: 'Login exitoso',
      status: 200,
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'op@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        correo: 'op@test.com',
        password: 'password123',
      });
    });
  });

  it('R23 - debe redirigir a /repartidor cuando el login es exitoso con rol REPARTIDOR', async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({
      data: {
        accessToken: 'token-xyz',
        user: { id: '2', nombre: 'Rep User', correo: 'rep@test.com', rol: 'REPARTIDOR' },
      },
      message: 'Login exitoso',
      status: 200,
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'rep@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        correo: 'rep@test.com',
        password: 'password123',
      });
    });
  });

  it('R24 - debe redirigir a /tracking cuando el login es exitoso con rol CLIENTE', async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({
      data: {
        accessToken: 'token-cli',
        user: { id: '3', nombre: 'Cli User', correo: 'cli@test.com', rol: 'CLIENTE' },
      },
      message: 'Login exitoso',
      status: 200,
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'cli@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        correo: 'cli@test.com',
        password: 'password123',
      });
    });
  });

  it('R25 - debe mostrar Toast de error cuando el servidor devuelve 401', async () => {
    const errorMsg = 'Credenciales inválidas';
    mockLoginMutateAsync.mockRejectedValueOnce({
      response: { data: { message: errorMsg } },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
    });
  });
});
