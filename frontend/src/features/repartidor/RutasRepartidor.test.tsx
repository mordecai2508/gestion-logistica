import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RutasRepartidor } from './RutasRepartidor';
import type { RutaDto } from '@/types/rutaTypes';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockUseRutas = vi.fn();

vi.mock('@/hooks/useRutas', () => ({
  useRutas: (...args: unknown[]) => mockUseRutas(...args),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/repartidor/rutas']}>{ui}</MemoryRouter>);
}

const ruta1: RutaDto = {
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
  ],
};

const ruta2: RutaDto = {
  id: 'ruta-2',
  codigo: 'RUTA-0008',
  estado: 'PENDIENTE',
  createdAt: '',
  updatedAt: '',
  vehiculo: { id: 'v2', placa: 'XYZ-999', modelo: 'Furgón', capacidad: 800, estado: 'DISPONIBLE' },
  repartidor: { id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: false },
  envios: [
    {
      id: 'envio-2',
      codigoSeguimiento: 'TRK-20260605-BBBB2222',
      estado: 'EN_PREPARACION',
      direccionDestino: 'Calle 2 #2-2',
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

describe('RutasRepartidor', () => {
  it('R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos', () => {
    mockUseRutas.mockReturnValue({
      data: { data: [ruta1, ruta2], meta: { total: 2, page: 1, limit: 50, totalPages: 1 } },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<RutasRepartidor />);

    expect(screen.getByText('RUTA-0007')).toBeInTheDocument();
    expect(screen.getByText('EN_CURSO')).toBeInTheDocument();
    expect(screen.getByText('TRK-20260605-AAAA1111')).toBeInTheDocument();

    expect(screen.getByText('RUTA-0008')).toBeInTheDocument();
    expect(screen.getByText('EN_PREPARACION')).toBeInTheDocument();
    expect(screen.getByText('TRK-20260605-BBBB2222')).toBeInTheDocument();
  });

  it('R21 - debe mostrar "No tienes rutas asignadas" cuando la lista de rutas está vacía', () => {
    mockUseRutas.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<RutasRepartidor />);

    expect(screen.getByText('No tienes rutas asignadas')).toBeInTheDocument();
  });

  it('R5 - debe mostrar un indicador de carga y no la lista mientras la petición está en curso', () => {
    mockUseRutas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<RutasRepartidor />);

    expect(screen.getByText(/cargando rutas/i)).toBeInTheDocument();
    expect(screen.queryByText('No tienes rutas asignadas')).not.toBeInTheDocument();
  });

  it('R6 - debe mostrar un mensaje de error accesible cuando la petición falla', () => {
    mockUseRutas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderWithProviders(<RutasRepartidor />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
