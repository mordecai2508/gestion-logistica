import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportarIncidencia } from '../ReportarIncidencia';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useCrearIncidencia', () => ({
  useCrearIncidencia: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const mockOnClose = vi.fn();

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReportarIncidencia envioId="envio-1" onClose={mockOnClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────
// R1 (flujo desde el frontend) — reportar incidencia
// ────────────────────────────────────────────────────────────────

describe('R1 - debe enviar { envioId, tipo, descripcion } y mostrar confirmación en éxito', () => {
  it('envía la incidencia con los datos seleccionados y muestra el toast de confirmación', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'incidencia-1',
      tipo: 'DANIO',
      descripcion: 'El paquete llegó con la caja rota',
      estado: 'ABIERTA',
      foto: null,
      nota: null,
      envioId: 'envio-1',
      createdAt: '2026-06-08T10:00:00.000Z',
      updatedAt: '2026-06-08T10:00:00.000Z',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/tipo de incidencia/i), { target: { value: 'DANIO' } });
    fireEvent.change(screen.getByLabelText(/descripción de la incidencia/i), {
      target: { value: 'El paquete llegó con la caja rota' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        envioId: 'envio-1',
        tipo: 'DANIO',
        descripcion: 'El paquete llegó con la caja rota',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/incidencia reportada/i);
    });
  });

  it('no envía la incidencia y muestra un error inline si la descripción está vacía', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/la descripción es requerida/i);
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('muestra un toast de error con el mensaje devuelto por el backend cuando la mutación falla', async () => {
    mockMutateAsync.mockRejectedValue({
      response: { data: { message: 'El envío indicado no existe' } },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/descripción de la incidencia/i), {
      target: { value: 'Cliente no se encontraba en el lugar' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/el envío indicado no existe/i);
    });
  });
});
