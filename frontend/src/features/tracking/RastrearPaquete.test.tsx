import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RastrearPaquete } from './RastrearPaquete';
import type { TrackingResponseDto } from '@/types/trackingTypes';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/services/trackingService', () => ({
  trackingService: {
    getByCodigo: vi.fn(),
  },
}));

vi.mock('@/hooks/useTrackingSocket', () => ({
  useTrackingSocket: vi.fn(),
}));

vi.mock('./TrackingMap', () => ({
  TrackingMap: ({ lat, lng }: { lat: number | null; lng: number | null }) => (
    <div data-testid="tracking-map" data-lat={lat} data-lng={lng} />
  ),
}));

vi.mock('./EventoTimeline', () => ({
  EventoTimeline: ({ eventos }: { eventos: unknown[] }) => (
    <ul data-testid="evento-timeline">
      {(eventos as Array<{ id: string; estado: string; descripcion: string }>).map((ev) => (
        <li key={ev.id} data-testid={`evento-${ev.id}`}>
          {ev.estado} — {ev.descripcion}
        </li>
      ))}
    </ul>
  ),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTrackingResponse(overrides: Partial<TrackingResponseDto> = {}): TrackingResponseDto {
  return {
    envioId: 'envio-1',
    codigoSeguimiento: 'TRK-20260605-ABCD1234',
    estado: 'EN_TRANSITO',
    remitente: 'Remitente Test',
    destinatario: 'Destinatario Test',
    direccionDestino: 'Calle Test 123',
    ultimaActualizacion: '2026-06-05T14:30:00.000Z',
    eventos: [
      {
        id: 'ev-1',
        estado: 'PENDIENTE',
        descripcion: 'Envío creado',
        lat: null,
        lng: null,
        timestamp: '2026-06-05T10:00:00.000Z',
      },
      {
        id: 'ev-2',
        estado: 'EN_TRANSITO',
        descripcion: 'En tránsito',
        lat: 4.711,
        lng: -74.0721,
        timestamp: '2026-06-05T14:30:00.000Z',
      },
    ],
    ...overrides,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RastrearPaquete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R17 — debe renderizar el campo de búsqueda y el botón "Buscar"', () => {
    renderWithQuery(<RastrearPaquete />);

    expect(
      screen.getByPlaceholderText('Ingrese código de seguimiento'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
  });

  it('R25 — debe mostrar error inline y no llamar a la API cuando el campo está vacío', async () => {
    const { trackingService } = await import('@/services/trackingService');
    const mockedService = vi.mocked(trackingService);

    renderWithQuery(<RastrearPaquete />);

    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(screen.getByText('Ingrese un código de seguimiento')).toBeInTheDocument();
    expect(mockedService.getByCodigo).not.toHaveBeenCalled();
  });

  it('R18 — debe llamar a trackingService.getByCodigo con el código introducido al presionar "Buscar"', async () => {
    const { trackingService } = await import('@/services/trackingService');
    const mockedService = vi.mocked(trackingService);
    mockedService.getByCodigo.mockResolvedValue(makeTrackingResponse());

    renderWithQuery(<RastrearPaquete />);

    fireEvent.change(screen.getByPlaceholderText('Ingrese código de seguimiento'), {
      target: { value: 'TRK-20260605-ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(mockedService.getByCodigo).toHaveBeenCalledWith('TRK-20260605-ABCD1234');
    });
  });

  it('R19 — debe mostrar el badge de estado, la última actualización y el mapa al recibir resultado', async () => {
    const { trackingService } = await import('@/services/trackingService');
    const mockedService = vi.mocked(trackingService);
    mockedService.getByCodigo.mockResolvedValue(makeTrackingResponse());

    renderWithQuery(<RastrearPaquete />);

    fireEvent.change(screen.getByPlaceholderText('Ingrese código de seguimiento'), {
      target: { value: 'TRK-20260605-ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText('EN_TRANSITO')).toBeInTheDocument();
    });

    expect(screen.getByText(/Última actualización:/)).toBeInTheDocument();
    expect(screen.getByTestId('tracking-map')).toBeInTheDocument();
  });

  it('R22 — debe renderizar la línea de tiempo con los eventos recibidos', async () => {
    const { trackingService } = await import('@/services/trackingService');
    const mockedService = vi.mocked(trackingService);
    mockedService.getByCodigo.mockResolvedValue(makeTrackingResponse());

    renderWithQuery(<RastrearPaquete />);

    fireEvent.change(screen.getByPlaceholderText('Ingrese código de seguimiento'), {
      target: { value: 'TRK-20260605-ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('evento-timeline')).toBeInTheDocument();
    });

    expect(screen.getByTestId('evento-ev-1')).toBeInTheDocument();
    expect(screen.getByTestId('evento-ev-2')).toBeInTheDocument();
  });

  it('R24 — debe mostrar "Código de seguimiento no encontrado" cuando el API devuelve 404', async () => {
    const { trackingService } = await import('@/services/trackingService');
    const mockedService = vi.mocked(trackingService);
    mockedService.getByCodigo.mockRejectedValue(new Error('404'));

    renderWithQuery(<RastrearPaquete />);

    fireEvent.change(screen.getByPlaceholderText('Ingrese código de seguimiento'), {
      target: { value: 'TRK-20260605-ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Código de seguimiento no encontrado'),
      ).toBeInTheDocument();
    });
  });
});
