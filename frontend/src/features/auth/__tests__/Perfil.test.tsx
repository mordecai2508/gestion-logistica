import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Perfil } from '../Perfil';

// Mock usePerfil hook
const mockUsePerfil = vi.fn();
vi.mock('@/hooks/usePerfil', () => ({
  usePerfil: () => mockUsePerfil(),
}));

// Mock useUpdatePerfil hook
const mockMutateAsync = vi.fn();
const mockUpdatePerfilMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

vi.mock('@/hooks/useUpdatePerfil', () => ({
  useUpdatePerfil: () => mockUpdatePerfilMutation,
}));

const mockPerfil = {
  id: 'user-1',
  nombre: 'Ana García',
  correo: 'ana@example.com',
  telefono: '3001234567',
  rol: 'OPERADOR',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function renderPerfil() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/perfil']}>
        <Perfil />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdatePerfilMutation.isPending = false;
  mockUsePerfil.mockReturnValue({
    data: mockPerfil,
    isPending: false,
  });
});

describe('Perfil component', () => {
  it('R1 - debe renderizar datos del perfil', () => {
    renderPerfil();

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
    expect(screen.getByLabelText('Rol')).toBeInTheDocument();
    expect(screen.getByLabelText('Rol')).toHaveTextContent('OPERADOR');

    const correoInput = screen.getByLabelText('Correo electrónico') as HTMLInputElement;
    expect(correoInput.disabled).toBe(true);
    expect(correoInput.value).toBe('ana@example.com');
  });

  it('R4 - debe llamar a updatePerfil al enviar formulario con datos válidos', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      ...mockPerfil,
      nombre: 'Nuevo Nombre',
    });

    renderPerfil();

    const nombreInput = screen.getByLabelText('Nombre completo');
    fireEvent.change(nombreInput, { target: { value: 'Nuevo Nombre' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Nuevo Nombre' }),
      );
    });
  });

  it('R7 - debe mostrar error si el formulario no tiene al menos nombre o telefono', async () => {
    renderPerfil();

    // Clear both fields
    const nombreInput = screen.getByLabelText('Nombre completo');
    const telefonoInput = screen.getByLabelText('Teléfono');
    fireEvent.change(nombreInput, { target: { value: '' } });
    fireEvent.change(telefonoInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('R1 - debe mostrar estado de carga mientras carga el perfil', () => {
    mockUsePerfil.mockReturnValue({
      data: undefined,
      isPending: true,
    });

    renderPerfil();

    expect(screen.getByLabelText('Cargando perfil')).toBeInTheDocument();
  });
});
