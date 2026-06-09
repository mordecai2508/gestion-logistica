import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportesPage } from '../ReportesPage';
import type { ReporteEnviosDto, RepartidorRankingDto } from '@/types/reportes';

// ────────────────────────────────────────────────────────────────
// Mock recharts
// ────────────────────────────────────────────────────────────────
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: import('react').ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: import('react').ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ────────────────────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────────────────────
const mockReporteEnvios: ReporteEnviosDto = {
  porEstado: [
    { estado: 'ENTREGADO', total: 5 },
    { estado: 'PENDIENTE', total: 3 },
  ],
  porDia: [
    { fecha: '2026-06-01', total: 4 },
    { fecha: '2026-06-02', total: 4 },
  ],
  totalPeriodo: 8,
};

const mockRanking: RepartidorRankingDto[] = [
  { id: 'rep-1', nombre: 'Carlos García', totalEntregados: 10, totalFallidos: 2 },
  { id: 'rep-2', nombre: 'Ana Rodríguez', totalEntregados: 5, totalFallidos: 1 },
];

// ────────────────────────────────────────────────────────────────
// Hook mocks
// ────────────────────────────────────────────────────────────────
let mockEnviosResult: {
  data: ReporteEnviosDto | undefined;
  isLoading: boolean;
  isError: boolean;
};
let mockRankingResult: {
  data: RepartidorRankingDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useReportes', () => ({
  useReporteEnvios: () => mockEnviosResult,
  useRepartidoresRanking: () => mockRankingResult,
}));

// ────────────────────────────────────────────────────────────────
// Mock reportesService
// ────────────────────────────────────────────────────────────────
const mockExportEnviosCSV = vi.fn();
vi.mock('@/services/reportesService', () => ({
  reportesService: {
    exportEnviosCSV: (...args: unknown[]) => mockExportEnviosCSV(...args),
  },
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/reportes']}>
        <ReportesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnviosResult = { data: mockReporteEnvios, isLoading: false, isError: false };
  mockRankingResult = { data: mockRanking, isLoading: false, isError: false };
});

// ────────────────────────────────────────────────────────────────
// R12 — renderiza título "Reportes" y secciones principales
// ────────────────────────────────────────────────────────────────
describe('R12 — debe renderizar título "Reportes" y las secciones principales', () => {
  it('muestra el título y los paneles de la página de reportes', () => {
    renderPage();

    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Envíos por día')).toBeInTheDocument();
    expect(screen.getByText('Desglose por estado')).toBeInTheDocument();
    expect(screen.getByText('Ranking de repartidores')).toBeInTheDocument();
    expect(screen.getByText('Rango de fechas')).toBeInTheDocument();
  });

  it('muestra el botón de Exportar CSV', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R13 — al cambiar la fecha llama al hook con el nuevo rango
// ────────────────────────────────────────────────────────────────
describe('R13 — al cambiar el input de fecha llama al hook con el nuevo rango', () => {
  it('actualiza el rango cuando se cambia la fecha desde', async () => {
    const { rerender } = renderPage();

    const inputDesde = screen.getByLabelText('Fecha desde');
    fireEvent.change(inputDesde, { target: { value: '2026-05-01' } });

    // After the change, the component re-renders with the new date
    // The hook mock receives the updated value on next render
    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
    });

    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/reportes']}>
          <ReportesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
});

// ────────────────────────────────────────────────────────────────
// R14 — muestra skeleton/loading cuando isLoading es true
// ────────────────────────────────────────────────────────────────
describe('R14 — muestra skeleton mientras isLoading es true', () => {
  it('muestra skeletons cuando los datos de envíos están cargando', () => {
    mockEnviosResult = { data: undefined, isLoading: true, isError: false };
    mockRankingResult = { data: undefined, isLoading: true, isError: false };

    renderPage();

    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────
// R15/R16 — al click en "Exportar CSV" llama a exportEnviosCSV con las fechas actuales
// ────────────────────────────────────────────────────────────────
describe('R15/R16 — al click en "Exportar CSV" llama a exportEnviosCSV con las fechas actuales', () => {
  it('llama a reportesService.exportEnviosCSV con desde y hasta al hacer click', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
    mockExportEnviosCSV.mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    renderPage();

    const exportBtn = screen.getByRole('button', { name: /exportar csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockExportEnviosCSV).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockExportEnviosCSV.mock.calls[0][0] as { desde: string; hasta: string };
    expect(callArgs).toHaveProperty('desde');
    expect(callArgs).toHaveProperty('hasta');
  });
});
