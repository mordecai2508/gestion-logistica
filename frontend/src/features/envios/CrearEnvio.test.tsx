import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CrearEnvio } from './CrearEnvio';

// Mock clienteService to avoid real API calls in tests
vi.mock('@/services/clienteService', () => ({
  clienteService: {
    search: vi.fn().mockResolvedValue([
      { id: 'clhqzv2k10000qwer5678abcd', usuario: { nombre: 'Ana García', correo: 'ana@example.com' } },
    ]),
  },
}));

// Mock useCrearEnvio hook
const mockMutateAsync = vi.fn();
const mockUseCrearEnvio = {
  mutateAsync: mockMutateAsync,
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

vi.mock('@/hooks/useCrearEnvio', () => ({
  useCrearEnvio: () => mockUseCrearEnvio,
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

function renderCrearEnvio() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/envios/crear']}>
        <CrearEnvio />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Fills all visible fields. The clienteId is set by selecting from the
 * combobox dropdown: type in the search box, wait for the dropdown option,
 * then click it — this triggers form.setValue('clienteId', ...) internally.
 * Must be called with real timers active so the debounce can fire.
 */
async function fillForm() {
  fireEvent.change(screen.getByLabelText('Remitente'), { target: { value: 'Juan Pérez' } });
  fireEvent.change(screen.getByLabelText('Destinatario'), { target: { value: 'María López' } });
  fireEvent.change(screen.getByLabelText('Dirección destino'), {
    target: { value: 'Calle 123, Bogotá' },
  });
  fireEvent.change(screen.getByLabelText('Peso en kg'), { target: { value: '2.5' } });
  fireEvent.change(screen.getByLabelText('Dimensiones en cm'), { target: { value: '30x20x15' } });

  // Simulate combobox: type to trigger debounced query, wait for dropdown, click option
  fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Ana' } });
  // Wait for the debounce (300ms) + mocked async query to resolve and dropdown to render
  await waitFor(
    () => {
      expect(screen.getByRole('option', { name: /Ana García — ana@example.com/i })).toBeInTheDocument();
    },
    { timeout: 2000 },
  );
  fireEvent.mouseDown(screen.getByRole('option', { name: /Ana García — ana@example.com/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mockUseCrearEnvio.isPending = false;
  mockUseCrearEnvio.isError = false;
  mockUseCrearEnvio.error = null;
});

describe('CrearEnvio component', () => {
  it('debe renderizar todos los campos del formulario', () => {
    renderCrearEnvio();

    expect(screen.getByText('Nuevo Envío')).toBeInTheDocument();
    expect(screen.getByLabelText('Remitente')).toBeInTheDocument();
    expect(screen.getByLabelText('Destinatario')).toBeInTheDocument();
    expect(screen.getByLabelText('Dirección destino')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso en kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Dimensiones en cm')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción del paquete')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar cliente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar envío/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('debe mostrar errores de validación al enviar el formulario vacío', async () => {
    renderCrearEnvio();

    fireEvent.click(screen.getByRole('button', { name: /guardar envío/i }));

    await waitFor(() => {
      expect(screen.getByText('El remitente es requerido')).toBeInTheDocument();
      expect(screen.getByText('El destinatario es requerido')).toBeInTheDocument();
      expect(screen.getByText('La dirección de destino es requerida')).toBeInTheDocument();
    });
  });

  it('debe llamar a envioService.crear con los datos correctos al enviar el formulario', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260604-A3F9B21C',
      estado: 'PENDIENTE',
    });

    renderCrearEnvio();
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /guardar envío/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          remitente: 'Juan Pérez',
          destinatario: 'María López',
          direccionDestino: 'Calle 123, Bogotá',
          peso: 2.5,
          dimensiones: '30x20x15',
          clienteId: 'clhqzv2k10000qwer5678abcd',
        }),
      );
    });
  });

  it('debe mostrar Toast de éxito y navegar a /envios al recibir 201', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260604-A3F9B21C',
      estado: 'PENDIENTE',
    });

    renderCrearEnvio();
    // fillForm must run with real timers so debounce fires
    await fillForm();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole('button', { name: /guardar envío/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Envío creado exitosamente');
    });

    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/envios');
    });

    vi.useRealTimers();
  });

  it('debe mostrar Toast de error cuando la API devuelve un error', async () => {
    const errorMsg = 'Cliente no encontrado';
    mockMutateAsync.mockRejectedValueOnce({
      response: {
        data: { message: errorMsg, error: 'CLIENTE_NOT_FOUND', statusCode: 404 },
      },
    });

    renderCrearEnvio();
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /guardar envío/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
    });
  });

  it('debe deshabilitar el botón GUARDAR ENVÍO mientras isPending es true', () => {
    mockUseCrearEnvio.isPending = true;

    renderCrearEnvio();

    const saveButton = screen.getByRole('button', { name: /guardando/i });
    expect(saveButton).toBeDisabled();
  });

  it('R13 — debe navegar a /envios al hacer click en Cancelar sin llamar a mutateAsync', async () => {
    renderCrearEnvio();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/envios');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
