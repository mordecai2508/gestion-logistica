import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditarEnvioModal } from './EditarEnvioModal';

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useEditarEnvio', () => ({
  useEditarEnvio: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockEnvio = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-20260604-ABCD1234',
  estado: 'PENDIENTE',
  remitente: 'Juan Pérez',
  destinatario: 'María López',
  direccionDestino: 'Calle 123, Bogotá',
  peso: 2.5,
  dimensiones: '30x20x15',
  descripcion: 'Paquete frágil',
  clienteId: 'cliente-1',
  rutaId: null,
  createdAt: '2026-06-04T00:00:00.000Z',
  updatedAt: '2026-06-04T00:00:00.000Z',
  eventos: [],
};

vi.mock('@/hooks/useEnvioDetalle', () => ({
  useEnvioDetalle: () => ({
    data: mockEnvio,
    isLoading: false,
  }),
}));

// ── helpers ────────────────────────────────────────────────────────────────────

const mockOnClose = vi.fn();

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditarEnvioModal envioId="envio-1" onClose={mockOnClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── tests ──────────────────────────────────────────────────────────────────────

describe('EditarEnvioModal component', () => {
  it('debe renderizar todos los campos editables pre-poblados', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Remitente')).toHaveValue('Juan Pérez');
      expect(screen.getByLabelText('Destinatario')).toHaveValue('María López');
      expect(screen.getByLabelText('Dirección destino')).toHaveValue('Calle 123, Bogotá');
      expect(screen.getByLabelText('Peso en kg')).toHaveValue(2.5);
      expect(screen.getByLabelText('Dimensiones en cm')).toHaveValue('30x20x15');
      expect(screen.getByLabelText('Descripción')).toHaveValue('Paquete frágil');
    });
  });

  it('debe mostrar errores de validación al enviar con peso negativo', async () => {
    renderModal();

    await waitFor(() => screen.getByLabelText('Peso en kg'));

    fireEvent.change(screen.getByLabelText('Peso en kg'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText('El peso debe ser mayor a 0')).toBeInTheDocument();
    });
  });

  it('R30 — debe llamar a envioService.editar con los datos correctos al enviar', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'envio-1', remitente: 'Nuevo Remitente' });
    renderModal();

    await waitFor(() => screen.getByLabelText('Remitente'));

    fireEvent.change(screen.getByLabelText('Remitente'), { target: { value: 'Nuevo Remitente' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ remitente: 'Nuevo Remitente' }),
      );
    });
  });

  it('debe mostrar Toast de éxito y cerrar el modal al recibir 200', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockMutateAsync.mockResolvedValueOnce({ id: 'envio-1' });
    renderModal();

    await waitFor(() => screen.getByLabelText('Remitente'));

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Envío actualizado exitosamente');
    });

    vi.advanceTimersByTime(1200);
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('debe mostrar Toast de error cuando la API devuelve un error', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      response: { data: { message: 'Error del servidor', error: 'INTERNAL_ERROR', statusCode: 500 } },
    });
    renderModal();

    await waitFor(() => screen.getByLabelText('Remitente'));

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Error del servidor');
    });
  });
});
