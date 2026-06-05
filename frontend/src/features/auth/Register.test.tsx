import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Register } from './Register';

// Mock useAuth hook
const mockRegisterMutateAsync = vi.fn();
const mockRegisterMutation = {
  mutateAsync: mockRegisterMutateAsync,
  mutate: vi.fn(),
  isPending: false,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ registerMutation: mockRegisterMutation }),
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

function renderRegister() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <Register />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const validFormData = {
  nombre: 'Ana García',
  correo: 'ana@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  telefono: '3001234567',
};

function fillForm(overrides: Partial<typeof validFormData> = {}) {
  const data = { ...validFormData, ...overrides };
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: data.nombre },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: data.correo },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: data.password },
  });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: data.confirmPassword },
  });
  fireEvent.change(screen.getByLabelText('Teléfono'), {
    target: { value: data.telefono },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRegisterMutation.isPending = false;
});

describe('Register component', () => {
  it('R14 - debe renderizar todos los elementos del wireframe: título, campos, selector de rol, botón, link', () => {
    renderRegister();

    // Title
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument();

    // Logo
    expect(screen.getByLabelText('Logo')).toBeInTheDocument();

    // Fields
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();

    // Rol selector
    expect(screen.getByLabelText('Rol')).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument();

    // Login link
    expect(screen.getByText(/Inicia sesión/i)).toBeInTheDocument();
  });

  it('R15 - debe mostrar error de validación en el campo correo si el formato es inválido', async () => {
    renderRegister();

    fillForm({ correo: 'not-an-email' });
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText('Correo inválido')).toBeInTheDocument();
    });
  });

  it('R15 - debe mostrar error si confirmPassword no coincide con password', async () => {
    renderRegister();

    fillForm({ confirmPassword: 'diferente999' });
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });
  });

  it('R16 - debe redirigir a /login cuando el registro es exitoso (201)', async () => {
    mockRegisterMutateAsync.mockResolvedValueOnce({
      id: 'new-user-id',
      correo: 'ana@example.com',
      rol: 'CLIENTE',
    });

    renderRegister();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(mockRegisterMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Ana García',
          correo: 'ana@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          telefono: '3001234567',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('R17 - debe mostrar Toast de error cuando el servidor devuelve 409', async () => {
    const errorMsg = 'El correo ya está registrado';
    mockRegisterMutateAsync.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { message: errorMsg, error: 'EMAIL_ALREADY_EXISTS', statusCode: 409 },
      },
    });

    renderRegister();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
    });
  });

  it('R18 - debe mostrar mensaje de error de campo cuando el servidor devuelve 422', async () => {
    mockRegisterMutateAsync.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'El correo debe tener un formato válido',
          error: 'ValidationError',
          statusCode: 422,
        },
      },
    });

    renderRegister();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
