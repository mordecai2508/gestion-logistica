import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MapaRepartidor } from './MapaRepartidor';
import type { RutaDto, EnvioEnRutaDto } from '@/types/rutaTypes';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockUseRutas = vi.fn();

vi.mock('@/hooks/useRutas', () => ({
  useRutas: (...args: unknown[]) => mockUseRutas(...args),
}));

vi.mock('./RepartidorMap', () => ({
  RepartidorMap: ({ envios }: { envios: EnvioEnRutaDto[] }) => (
    <div data-testid="repartidor-map" data-marker-count={envios.length}>
      {envios.map((envio) => (
        <div key={envio.id} data-testid={`marker-${envio.id}`} />
      ))}
    </div>
  ),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/repartidor/mapa']}>{ui}</MemoryRouter>);
}

const rutaActivaConCoordenadas: RutaDto = {
  id: 'ruta-1',
  codigo: 'RUTA-0007',
  estado: 'EN_CURSO',
  createdAt: '',
  updatedAt: '',
  vehiculo: { id: 'v1', placa: 'ABC-123', modelo: 'Camión', capacidad: 1000, estado: 'EN_RUTA' },
  repartidor: { id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: false },
  envios: [
    {
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260605-AAAA1111',
      estado: 'EN_TRANSITO',
      direccionDestino: 'Calle 1 #1-1',
      lat: 4.711,
      lng: -74.0721,
    },
    {
      id: 'envio-2',
      codigoSeguimiento: 'TRK-20260605-BBBB2222',
      estado: 'PENDIENTE',
      direccionDestino: 'Calle 2 #2-2',
      lat: 4.72,
      lng: -74.08,
    },
    {
      id: 'envio-3',
      codigoSeguimiento: 'TRK-20260605-CCCC3333',
      estado: 'PENDIENTE',
      direccionDestino: 'Calle 3 #3-3',
      lat: null,
      lng: null,
    },
  ],
};

const rutaCompletada: RutaDto = {
  id: 'ruta-0',
  codigo: 'RUTA-0006',
  estado: 'COMPLETADA',
  createdAt: '',
  updatedAt: '',
  vehiculo: { id: 'v0', placa: 'DEF-000', modelo: 'Camión', capacidad: 1000, estado: 'DISPONIBLE' },
  repartidor: { id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: true },
  envios: [
    {
      id: 'envio-0',
      codigoSeguimiento: 'TRK-20260605-ZZZZ0000',
      estado: 'ENTREGADO',
      direccionDestino: 'Calle 0 #0-0',
      lat: 4.7,
      lng: -74.07,
    },
  ],
};

const rutaActivaSinCoordenadas: RutaDto = {
  ...rutaActivaConCoordenadas,
  id: 'ruta-2',
  codigo: 'RUTA-0009',
  estado: 'PENDIENTE',
  envios: [
    {
      id: 'envio-4',
      codigoSeguimiento: 'TRK-20260605-DDDD4444',
      estado: 'PENDIENTE',
      direccionDestino: 'Calle 4 #4-4',
      lat: null,
      lng: null,
    },
  ],
};

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MapaRepartidor', () => {
  it('R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa', () => {
    mockUseRutas.mockReturnValue({
      data: { data: [rutaCompletada, rutaActivaConCoordenadas], meta: { total: 2, page: 1, limit: 50, totalPages: 1 } },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<MapaRepartidor />);

    const map = screen.getByTestId('repartidor-map');
    expect(map).toHaveAttribute('data-marker-count', '2');
    expect(screen.getByTestId('marker-envio-1')).toBeInTheDocument();
    expect(screen.getByTestId('marker-envio-2')).toBeInTheDocument();
    expect(screen.queryByTestId('marker-envio-3')).not.toBeInTheDocument();
  });

  it('R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando no hay ruta activa', () => {
    mockUseRutas.mockReturnValue({
      data: { data: [rutaCompletada], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<MapaRepartidor />);

    expect(screen.getByText('Sin ubicaciones disponibles para mostrar')).toBeInTheDocument();
    expect(screen.queryByTestId('repartidor-map')).not.toBeInTheDocument();
  });

  it('R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando la ruta activa no tiene envíos con coordenadas', () => {
    mockUseRutas.mockReturnValue({
      data: { data: [rutaActivaSinCoordenadas], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<MapaRepartidor />);

    expect(screen.getByText('Sin ubicaciones disponibles para mostrar')).toBeInTheDocument();
    expect(screen.queryByTestId('repartidor-map')).not.toBeInTheDocument();
  });

  it('R14 - debe mostrar un indicador de carga y no el mapa mientras la petición está en curso', () => {
    mockUseRutas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<MapaRepartidor />);

    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument();
    expect(screen.queryByTestId('repartidor-map')).not.toBeInTheDocument();
  });

  it('R15 - debe mostrar un mensaje de error accesible cuando la petición falla', () => {
    mockUseRutas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderWithProviders(<MapaRepartidor />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
