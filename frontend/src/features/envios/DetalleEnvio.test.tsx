import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DetalleEnvio } from './DetalleEnvio';

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

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
  updatedAt: '2026-06-04T12:00:00.000Z',
  eventos: [
    {
      id: 'ev-1',
      estado: 'PENDIENTE',
      descripcion: 'Envío creado',
      lat: null,
      lng: null,
      timestamp: '2026-06-04T00:00:00.000Z',
    },
    {
      id: 'ev-2',
      estado: 'EN_TRANSITO',
      descripcion: 'En camino',
      lat: 4.711,
      lng: -74.072,
      timestamp: '2026-06-04T06:00:00.000Z',
    },
  ],
};

vi.mock('@/hooks/useEnvioDetalle', () => ({
  useEnvioDetalle: () => ({
    data: mockEnvio,
    isLoading: false,
    isError: false,
  }),
}));

// ── helpers ────────────────────────────────────────────────────────────────────

function renderDetalle() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/envios/envio-1']}>
        <Routes>
          <Route path="/envios/:id" element={<DetalleEnvio />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── tests ──────────────────────────────────────────────────────────────────────

describe('DetalleEnvio component', () => {
  it('R11 — debe renderizar todos los campos del EnvioDetalleDto', () => {
    renderDetalle();

    expect(screen.getByText('TRK-20260604-ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Calle 123, Bogotá')).toBeInTheDocument();
    expect(screen.getByText('2.5 kg')).toBeInTheDocument();
    expect(screen.getByText('30x20x15 cm')).toBeInTheDocument();
    expect(screen.getByText('Paquete frágil')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado: PENDIENTE')).toBeInTheDocument();
  });

  it('debe renderizar el historial de EventoEnvio en orden cronológico', () => {
    renderDetalle();

    const eventDescriptions = screen.getAllByText(/Envío creado|En camino/);
    expect(eventDescriptions).toHaveLength(2);
    // First event should appear before second
    const allText = document.body.textContent ?? '';
    expect(allText.indexOf('Envío creado')).toBeLessThan(allText.indexOf('En camino'));
  });

  it('debe navegar a /envios al hacer clic en el botón Volver', () => {
    renderDetalle();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/envios');
  });
});
