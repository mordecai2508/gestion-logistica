import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MisEnvios } from '../MisEnvios';

// ────────────────────────────────────────────────────────────────
// Fixture data
// ────────────────────────────────────────────────────────────────

const mockEnvio = {
  id: 'envio-1',
  codigoSeguimiento: 'TRK-TEST-001',
  estado: 'PENDIENTE' as const,
  destinatario: 'Juan Pérez',
  createdAt: '2026-06-01T10:00:00Z',
};
const mockMeta = { total: 1, page: 1, limit: 10, totalPages: 1 };

// ────────────────────────────────────────────────────────────────
// Hook mock — mutable return value
// ────────────────────────────────────────────────────────────────

let mockUseMisEnviosReturn: {
  data: { data: typeof mockEnvio[]; meta: typeof mockMeta } | undefined;
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useMisEnvios', () => ({
  useMisEnvios: () => mockUseMisEnviosReturn,
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

function renderMisEnvios() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/mis-envios']}>
        <MisEnvios />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMisEnviosReturn = {
    data: { data: [mockEnvio], meta: mockMeta },
    isLoading: false,
    isError: false,
  };
});

// ────────────────────────────────────────────────────────────────
// R8 — tabla con columnas correctas
// ────────────────────────────────────────────────────────────────

describe('R8 — debe renderizar tabla con columnas Código, Estado, Destinatario, Fecha creación', () => {
  it('muestra los encabezados de columna y los datos del envío', () => {
    renderMisEnvios();

    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Destinatario')).toBeInTheDocument();
    expect(screen.getByText('Fecha creación')).toBeInTheDocument();

    expect(screen.getByText('TRK-TEST-001')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R9 — badge con clases correctas para cada estado
// ────────────────────────────────────────────────────────────────

describe('R9 — badge tiene clases correctas para cada estado', () => {
  it('PENDIENTE tiene clase bg-orange-100', () => {
    renderMisEnvios();

    const badge = screen.getByLabelText('Estado: PENDIENTE');
    expect(badge.className).toContain('bg-orange-100');
  });

  it('ENTREGADO tiene clase bg-green-100', () => {
    mockUseMisEnviosReturn = {
      data: {
        data: [{ ...mockEnvio, estado: 'ENTREGADO' as const }],
        meta: mockMeta,
      },
      isLoading: false,
      isError: false,
    };
    renderMisEnvios();

    const badge = screen.getByLabelText('Estado: ENTREGADO');
    expect(badge.className).toContain('bg-green-100');
  });

  it('CANCELADO tiene clase bg-red-100', () => {
    mockUseMisEnviosReturn = {
      data: {
        data: [{ ...mockEnvio, estado: 'CANCELADO' as const }],
        meta: mockMeta,
      },
      isLoading: false,
      isError: false,
    };
    renderMisEnvios();

    const badge = screen.getByLabelText('Estado: CANCELADO');
    expect(badge.className).toContain('bg-red-100');
  });
});

// ────────────────────────────────────────────────────────────────
// R10 — botón "Rastrear" navega a /tracking/:codigoSeguimiento
// ────────────────────────────────────────────────────────────────

describe('R10 — botón "Rastrear" navega a /tracking/:codigoSeguimiento', () => {
  it('llama a navigate con /tracking/TRK-TEST-001 al pulsar Rastrear', () => {
    renderMisEnvios();

    const btn = screen.getByRole('button', { name: /Rastrear envío TRK-TEST-001/i });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/tracking/TRK-TEST-001');
  });
});

// ────────────────────────────────────────────────────────────────
// R11 — paginación cuando totalPages > 1
// ────────────────────────────────────────────────────────────────

describe('R11 — controles de paginación aparecen cuando totalPages > 1', () => {
  it('muestra botones Anterior y Siguiente cuando hay 3 páginas', () => {
    mockUseMisEnviosReturn = {
      data: {
        data: [mockEnvio],
        meta: { total: 30, page: 1, limit: 10, totalPages: 3 },
      },
      isLoading: false,
      isError: false,
    };
    renderMisEnvios();

    expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
  });

  it('no muestra controles de paginación cuando totalPages === 1', () => {
    renderMisEnvios();

    expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Página siguiente')).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R12 — mensaje vacío
// ────────────────────────────────────────────────────────────────

describe('R12 — muestra mensaje vacío cuando data es []', () => {
  it('muestra "Aún no tienes envíos registrados" con lista vacía', () => {
    mockUseMisEnviosReturn = {
      data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      isLoading: false,
      isError: false,
    };
    renderMisEnvios();

    expect(screen.getByText('Aún no tienes envíos registrados')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R13 — indicador de carga
// ────────────────────────────────────────────────────────────────

describe('R13 — muestra indicador de carga cuando isLoading es true', () => {
  it('muestra elemento con role="status" mientras carga', () => {
    mockUseMisEnviosReturn = { data: undefined, isLoading: true, isError: false };
    renderMisEnvios();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R14 — mensaje de error
// ────────────────────────────────────────────────────────────────

describe('R14 — muestra mensaje de error cuando isError es true', () => {
  it('muestra texto de error cuando la API falla', () => {
    mockUseMisEnviosReturn = { data: undefined, isLoading: false, isError: true };
    renderMisEnvios();

    expect(screen.getByText(/Error al cargar tus envíos/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R15 — cambio de filtro re-llama al hook
// ────────────────────────────────────────────────────────────────

describe('R15 — cambio del selector de filtro actualiza el estado', () => {
  it('al seleccionar ENTREGADO el select tiene el valor ENTREGADO', () => {
    renderMisEnvios();

    const select = screen.getByRole('combobox', { name: /Filtrar por estado/i });
    fireEvent.change(select, { target: { value: 'ENTREGADO' } });

    expect((select as HTMLSelectElement).value).toBe('ENTREGADO');
  });
});
