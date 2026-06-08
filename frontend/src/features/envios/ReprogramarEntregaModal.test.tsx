import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReprogramarEntregaModal } from './ReprogramarEntregaModal';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useReprogramarEnvio', () => ({
  useReprogramarEnvio: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const mockOnClose = vi.fn();

/** Formatea una fecha como valor aceptado por un input `datetime-local` (YYYY-MM-DDTHH:mm). */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReprogramarEntregaModal envioId="envio-1" onClose={mockOnClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────
// R19/R21 (flujo desde el frontend) — reprogramar entrega
// ────────────────────────────────────────────────────────────────

describe('R19/R21 - debe validar fecha futura en cliente y enviar { envioId, fechaReprogramacion }', () => {
  it('muestra un error inline y no envía la mutación cuando no se selecciona ninguna fecha', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /^reprogramar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/selecciona una fecha y hora de entrega/i)).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('muestra un error inline y no envía la mutación cuando la fecha seleccionada no es futura', async () => {
    renderModal();

    const fechaPasada = toDatetimeLocalValue(new Date(Date.now() - 24 * 60 * 60 * 1000));

    fireEvent.change(screen.getByLabelText(/nueva fecha de entrega/i), {
      target: { value: fechaPasada },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reprogramar$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/la nueva fecha de entrega debe ser posterior a la fecha y hora actuales/i),
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('envía { envioId, fechaReprogramacion } en ISO 8601 cuando la fecha es futura y muestra confirmación', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260608-AAAA1111',
      estado: 'EN_RUTA',
      fechaReprogramacion: '2026-06-10T15:00:00.000Z',
    });

    renderModal();

    const fechaFutura = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const valorInput = toDatetimeLocalValue(fechaFutura);

    fireEvent.change(screen.getByLabelText(/nueva fecha de entrega/i), {
      target: { value: valorInput },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reprogramar$/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        envioId: 'envio-1',
        fechaReprogramacion: new Date(valorInput).toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/entrega reprogramada/i);
    });
  });

  it('muestra un toast de error con el mensaje devuelto por el backend cuando la mutación falla', async () => {
    mockMutateAsync.mockRejectedValue({
      response: { data: { message: 'No se puede reprogramar un envío en estado terminal' } },
    });

    renderModal();

    const fechaFutura = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    fireEvent.change(screen.getByLabelText(/nueva fecha de entrega/i), {
      target: { value: toDatetimeLocalValue(fechaFutura) },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reprogramar$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se puede reprogramar un envío en estado terminal/i);
    });
  });
});
