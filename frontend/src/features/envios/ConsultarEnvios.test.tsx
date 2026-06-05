import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConsultarEnvios } from './ConsultarEnvios';

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCancelar = vi.fn();
vi.mock('@/hooks/useCancelarEnvio', () => ({
  useCancelarEnvio: () => ({
    mutateAsync: mockCancelar,
    isPending: false,
  }),
}));

const mockUseEnvios = vi.fn();
vi.mock('@/hooks/useEnvios', () => ({
  useEnvios: (filters: unknown) => mockUseEnvios(filters),
}));

// Stub EditarEnvioModal to avoid deep render
vi.mock('./EditarEnvioModal', () => ({
  EditarEnvioModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Editar envío modal">
      <button onClick={onClose}>Cerrar modal</button>
    </div>
  ),
}));

// ── helpers ────────────────────────────────────────────────────────────────────

function makeEnvio(overrides: Record<string, unknown> = {}) {
  return {
    id: 'envio-1',
    codigoSeguimiento: 'TRK-20260604-ABCD1234',
    estado: 'PENDIENTE',
    remitente: 'Juan Pérez',
    destinatario: 'María López',
    clienteId: 'cliente-1',
    clienteNombre: 'Ana García',
    createdAt: '2026-06-04T00:00:00.000Z',
    ...overrides,
  };
}

function makePagedResponse(envios: ReturnType<typeof makeEnvio>[] = [makeEnvio()]) {
  return {
    data: envios,
    meta: { total: envios.length, page: 1, limit: 20, totalPages: 1 },
    message: 'Envíos obtenidos exitosamente',
    status: 200,
  };
}

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/envios']}>
        <ConsultarEnvios />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEnvios.mockReturnValue({ data: makePagedResponse(), isLoading: false, isError: false });
});

// ── tests ──────────────────────────────────────────────────────────────────────

describe('ConsultarEnvios component', () => {
  it('R22/R23/R25/R26 — debe renderizar la barra de búsqueda, la tabla, la paginación y el botón Nuevo Envío', () => {
    renderComponent();

    expect(screen.getByText('Consultar Envíos')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar envíos')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument();
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo envío/i })).toBeInTheDocument();
  });

  it('R24 — debe mostrar badges de color para cada estado', () => {
    const envios = [
      makeEnvio({ id: 'e1', estado: 'PENDIENTE', codigoSeguimiento: 'TRK-1' }),
      makeEnvio({ id: 'e2', estado: 'ENTREGADO', codigoSeguimiento: 'TRK-2' }),
      makeEnvio({ id: 'e3', estado: 'CANCELADO', codigoSeguimiento: 'TRK-3' }),
      makeEnvio({ id: 'e4', estado: 'EN_TRANSITO', codigoSeguimiento: 'TRK-4' }),
    ];
    mockUseEnvios.mockReturnValue({
      data: makePagedResponse(envios),
      isLoading: false,
      isError: false,
    });

    renderComponent();

    expect(screen.getByLabelText('Estado: PENDIENTE')).toHaveClass('bg-orange-100');
    expect(screen.getByLabelText('Estado: ENTREGADO')).toHaveClass('bg-green-100');
    expect(screen.getByLabelText('Estado: CANCELADO')).toHaveClass('bg-red-100');
    expect(screen.getByLabelText('Estado: EN_TRANSITO')).toHaveClass('bg-blue-100');
  });

  it('R27 — debe filtrar la tabla cuando el usuario escribe en la barra de búsqueda y presiona Enter', () => {
    renderComponent();

    const input = screen.getByLabelText('Buscar envíos');
    fireEvent.change(input, { target: { value: 'TRK' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockUseEnvios).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'TRK', cliente: 'TRK' }),
    );
  });

  it('R28 — debe navegar a /envios/:id al hacer clic en la acción ver', () => {
    renderComponent();

    fireEvent.click(screen.getByLabelText(/ver envío/i));

    expect(mockNavigate).toHaveBeenCalledWith('/envios/envio-1');
  });

  it('R29/R30 — debe abrir el modal de edición al hacer clic en editar', async () => {
    renderComponent();

    fireEvent.click(screen.getByLabelText(/editar envío/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Editar envío modal' })).toBeInTheDocument();
    });
  });

  it('R31 — debe mostrar AlertDialog de confirmación al hacer clic en eliminar', async () => {
    renderComponent();

    fireEvent.click(screen.getByLabelText(/eliminar envío/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /cancelar envío/i })).toBeInTheDocument();
      expect(screen.getByText(/está seguro/i)).toBeInTheDocument();
    });
  });

  it('R32 — debe llamar a envioService.cancelar y mostrar Toast de éxito al confirmar cancelación', async () => {
    mockCancelar.mockResolvedValueOnce({ id: 'envio-1', codigoSeguimiento: 'TRK-1', estado: 'CANCELADO' });
    renderComponent();

    fireEvent.click(screen.getByLabelText(/eliminar envío/i));
    await waitFor(() => screen.getByRole('dialog', { name: /cancelar envío/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelación/i }));

    await waitFor(() => {
      expect(mockCancelar).toHaveBeenCalledWith('envio-1');
      expect(screen.getByRole('alert')).toHaveTextContent('Envío cancelado exitosamente');
    });
  });

  it('R33 — debe mostrar Toast de error cuando DELETE devuelve 409', async () => {
    mockCancelar.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Solo se pueden cancelar envíos en estado PENDIENTE',
          error: 'INVALID_STATE_TRANSITION',
          statusCode: 409,
        },
      },
    });
    renderComponent();

    fireEvent.click(screen.getByLabelText(/eliminar envío/i));
    await waitFor(() => screen.getByRole('dialog', { name: /cancelar envío/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelación/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Solo se pueden cancelar envíos en estado PENDIENTE',
      );
    });
  });
});
