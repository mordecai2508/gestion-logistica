import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardOperador } from '../DashboardOperador';
import type {
  DashboardMetricsDto,
  EnvioRecienteDto,
  RutaPendienteDto,
  VehiculoDisponibleDto,
} from '@/types/dashboard';

// ────────────────────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────────────────────

const mockMetrics: DashboardMetricsDto = {
  totalEnvios: 20,
  enRuta: 5,
  entregados: 10,
  incidenciasAbiertas: 3,
};

const mockEnviosRecientes: EnvioRecienteDto[] = [
  {
    codigoSeguimiento: 'TRK-20260601-ABCD1234',
    clienteNombre: 'Juan Pérez',
    estado: 'EN_RUTA',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    codigoSeguimiento: 'TRK-20260602-EFGH5678',
    clienteNombre: 'María López',
    estado: 'ENTREGADO',
    createdAt: '2026-06-02T00:00:00.000Z',
  },
];

const mockRutasPendientes: RutaPendienteDto[] = [
  { id: 'ruta-1', codigo: 'RT-001', nombre: 'Ruta Norte', createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'ruta-2', codigo: 'RT-002', nombre: null, createdAt: '2026-06-02T00:00:00.000Z' },
];

const mockVehiculosDisponibles: VehiculoDisponibleDto[] = [
  { id: 'vehiculo-1', placa: 'ABC-123', modelo: 'Toyota Hilux', estado: 'DISPONIBLE' },
  { id: 'vehiculo-2', placa: 'XYZ-789', modelo: 'Chevrolet NPR', estado: 'DISPONIBLE' },
];

// ────────────────────────────────────────────────────────────────
// Hook mocks — success state by default
// ────────────────────────────────────────────────────────────────

let mockMetricsResult: {
  data: DashboardMetricsDto | undefined;
  isLoading: boolean;
  isError: boolean;
};
let mockEnviosResult: {
  data: EnvioRecienteDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
};
let mockRutasResult: {
  data: RutaPendienteDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
};
let mockVehiculosResult: {
  data: VehiculoDisponibleDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useDashboard', () => ({
  useDashboardMetrics: () => mockMetricsResult,
  useEnviosRecientes: () => mockEnviosResult,
  useRutasPendientes: () => mockRutasResult,
  useVehiculosDisponibles: () => mockVehiculosResult,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderDashboard() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardOperador />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMetricsResult = { data: mockMetrics, isLoading: false, isError: false };
  mockEnviosResult = { data: mockEnviosRecientes, isLoading: false, isError: false };
  mockRutasResult = { data: mockRutasPendientes, isLoading: false, isError: false };
  mockVehiculosResult = { data: mockVehiculosDisponibles, isLoading: false, isError: false };
});

// ────────────────────────────────────────────────────────────────
// R23/R24 — 4 metric cards with correct labels and values
// ────────────────────────────────────────────────────────────────

describe('R23/R24 — debe renderizar 4 tarjetas con labels y valores correctos', () => {
  it('muestra Total Envíos, En Ruta, Entregados e Incidencias Abiertas con sus valores', () => {
    renderDashboard();

    expect(screen.getByText('Total Envíos')).toBeInTheDocument();
    // "En Ruta" appears as a card label AND as a badge in the envíos table
    expect(screen.getAllByText('En Ruta').length).toBeGreaterThan(0);
    expect(screen.getByText('Entregados')).toBeInTheDocument();
    expect(screen.getByText('Incidencias Abiertas')).toBeInTheDocument();

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R25 — skeleton while loading
// ────────────────────────────────────────────────────────────────

describe('R25 — debe mostrar skeleton mientras los datos cargan', () => {
  it('muestra elementos de carga cuando isLoading es true', () => {
    mockMetricsResult = { data: undefined, isLoading: true, isError: false };

    renderDashboard();

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────
// R27 — envíos recientes table
// ────────────────────────────────────────────────────────────────

describe('R27 — debe renderizar la tabla de envíos recientes con los datos del mock', () => {
  it('muestra los códigos y nombres de cliente de los envíos recientes', () => {
    renderDashboard();

    expect(screen.getByText('TRK-20260601-ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('TRK-20260602-EFGH5678')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R28 — rutas pendientes panel
// ────────────────────────────────────────────────────────────────

describe('R28 — debe renderizar el panel de rutas pendientes con los códigos del mock', () => {
  it('muestra los códigos de ruta y botones de navegación', () => {
    renderDashboard();

    expect(screen.getByText('RT-001')).toBeInTheDocument();
    expect(screen.getByText('RT-002')).toBeInTheDocument();
  });

  it('navega a /rutas/:id al hacer click en la flecha', () => {
    renderDashboard();

    const btn = screen.getByRole('button', { name: 'Ver ruta RT-001' });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/rutas/ruta-1');
  });
});

// ────────────────────────────────────────────────────────────────
// R29 — vehículos disponibles panel
// ────────────────────────────────────────────────────────────────

describe('R29 — debe renderizar el panel de vehículos disponibles con placa/modelo del mock', () => {
  it('muestra las placas y modelos de los vehículos disponibles', () => {
    renderDashboard();

    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.getByText('XYZ-789')).toBeInTheDocument();
    expect(screen.getByText('Chevrolet NPR')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R30 — toast when API call fails
// ────────────────────────────────────────────────────────────────

describe('R30 — debe mostrar Toast cuando una llamada de API falla', () => {
  it('muestra un mensaje de error cuando metrics falla', async () => {
    mockMetricsResult = { data: undefined, isLoading: false, isError: true };

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Error al cargar métricas del dashboard')).toBeInTheDocument();
  });

  it('puede cerrarse el toast al hacer click en el botón de cierre', async () => {
    mockMetricsResult = { data: undefined, isLoading: false, isError: true };

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: 'Cerrar notificación' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R31 — "+ Nuevo Envío" button navigates to /envios/crear
// ────────────────────────────────────────────────────────────────

describe('R31 — el botón "+ Nuevo Envío" debe navegar a /envios/crear', () => {
  it('navega a /envios/crear al hacer click en el botón flotante', () => {
    renderDashboard();

    const btn = screen.getByRole('button', { name: 'Nuevo Envío' });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/envios/crear');
  });
});
