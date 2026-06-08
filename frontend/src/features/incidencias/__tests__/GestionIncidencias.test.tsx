import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestionIncidencias } from '../GestionIncidencias';
import type { IncidenciaListItemDto } from '@/types/incidenciaTypes';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockIncidencias: IncidenciaListItemDto[] = [
  {
    id: 'incidencia-1',
    tipo: 'CLIENTE_AUSENTE',
    descripcion: 'El cliente no se encontraba en la dirección registrada',
    estado: 'ABIERTA',
    envioId: 'envio-1',
    envioCodigoSeguimiento: 'TRK-20260605-AAAA1111',
    createdAt: '2026-06-05T10:00:00.000Z',
  },
  {
    id: 'incidencia-2',
    tipo: 'DANIO',
    descripcion: 'El paquete llegó con la caja deteriorada',
    estado: 'EN_PROCESO',
    envioId: 'envio-2',
    envioCodigoSeguimiento: 'TRK-20260605-BBBB2222',
    createdAt: '2026-06-04T09:30:00.000Z',
  },
];

let mockUseIncidenciasReturn: {
  data: { data: IncidenciaListItemDto[]; meta: { total: number; page: number; limit: number; totalPages: number } } | undefined;
  isLoading: boolean;
  isError: boolean;
};

const mockUseIncidencias = vi.fn();
vi.mock('@/hooks/useIncidencias', () => ({
  useIncidencias: (filters: { tipo?: string; estado?: string; page?: number }) => {
    mockUseIncidencias(filters);
    return mockUseIncidenciasReturn;
  },
}));

const mockActualizarMutateAsync = vi.fn();
vi.mock('@/hooks/useActualizarEstadoIncidencia', () => ({
  useActualizarEstadoIncidencia: () => ({
    mutateAsync: mockActualizarMutateAsync,
    isPending: false,
  }),
}));

const mockUser = { rol: 'OPERADOR' as const };
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { rol: string } | null }) => unknown) =>
    selector({ user: mockUser }),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/incidencias']}>
        <GestionIncidencias />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseIncidenciasReturn = {
    data: { data: mockIncidencias, meta: { total: 2, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
    isError: false,
  };
});

// ────────────────────────────────────────────────────────────────
// R25 — Tabla con columnas código/tipo/descripción/estado
// ────────────────────────────────────────────────────────────────

describe('R25 - debe mostrar la tabla con columnas código/tipo/descripción/estado', () => {
  it('renderiza el título, las columnas y las filas con sus datos', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: 'Incidencias' })).toBeInTheDocument();

    // Columns (scoped to the table header row — "Tipo"/"Estado" also appear as filter labels)
    const columnHeaders = screen.getAllByRole('columnheader');
    const headerNames = columnHeaders.map((header) => header.textContent);
    expect(headerNames).toEqual(['Código', 'Tipo', 'Descripción', 'Estado', 'Acciones']);

    // Rows — se acota la búsqueda al cuerpo de la tabla porque "Cliente
    // ausente"/"Daño"/"ABIERTA"/"EN_PROCESO" también aparecen como opciones
    // de los `Select` de filtros.
    const tableBody = screen.getAllByRole('rowgroup')[1];
    const filaUno = within(tableBody).getByText('TRK-20260605-AAAA1111').closest('tr')!;
    const filaDos = within(tableBody).getByText('TRK-20260605-BBBB2222').closest('tr')!;

    expect(within(filaUno).getByText('Cliente ausente')).toBeInTheDocument();
    expect(within(filaUno).getByText('El cliente no se encontraba en la dirección registrada')).toBeInTheDocument();
    expect(within(filaUno).getByText('ABIERTA')).toBeInTheDocument();

    expect(within(filaDos).getByText('Daño')).toBeInTheDocument();
    expect(within(filaDos).getByText('EN_PROCESO')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R26 — Filtrado por tipo/estado
// ────────────────────────────────────────────────────────────────

describe('R26 - debe filtrar la lista al cambiar tipo/estado', () => {
  it('actualiza los filtros enviados a useIncidencias al seleccionar un tipo', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por tipo/i), { target: { value: 'DANIO' } });

    await waitFor(() => {
      expect(mockUseIncidencias).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'DANIO', page: 1 }),
      );
    });
  });

  it('actualiza los filtros enviados a useIncidencias al seleccionar un estado', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: 'RESUELTA' } });

    await waitFor(() => {
      expect(mockUseIncidencias).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'RESUELTA', page: 1 }),
      );
    });
  });

  it('vuelve a "Todos" enviando el filtro como undefined', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por tipo/i), { target: { value: 'DANIO' } });
    fireEvent.change(screen.getByLabelText(/filtrar por tipo/i), { target: { value: 'TODOS' } });

    await waitFor(() => {
      expect(mockUseIncidencias).toHaveBeenLastCalledWith(
        expect.objectContaining({ tipo: undefined, page: 1 }),
      );
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R27 — Paginación
// ────────────────────────────────────────────────────────────────

describe('R27 - debe mostrar controles de paginación cuando hay más de una página', () => {
  it('no muestra controles de paginación cuando solo hay una página', () => {
    renderScreen();

    expect(screen.queryByRole('button', { name: /página siguiente/i })).not.toBeInTheDocument();
  });

  it('muestra controles de paginación y permite navegar entre páginas', async () => {
    mockUseIncidenciasReturn = {
      data: { data: mockIncidencias, meta: { total: 45, page: 1, limit: 20, totalPages: 3 } },
      isLoading: false,
      isError: false,
    };

    renderScreen();

    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => {
      expect(mockUseIncidencias).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });

    fireEvent.click(screen.getByRole('button', { name: /página siguiente/i }));

    await waitFor(() => {
      expect(mockUseIncidencias).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R28 — Cambio de estado vía acción "editar"
// ────────────────────────────────────────────────────────────────

describe('R28 - debe permitir cambiar el estado de una incidencia desde la acción "editar"', () => {
  it('abre el modal de cambio de estado, envía la mutación y muestra confirmación', async () => {
    mockActualizarMutateAsync.mockResolvedValue({ ...mockIncidencias[0], estado: 'EN_PROCESO' });

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /editar incidencia TRK-20260605-AAAA1111/i }));

    expect(screen.getByRole('dialog', { name: /cambiar estado de incidencia/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'EN_PROCESO' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockActualizarMutateAsync).toHaveBeenCalledWith({ id: 'incidencia-1', estado: 'EN_PROCESO' });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/estado de incidencia actualizado/i);
    });
  });

  it('refleja un error de la actualización mediante un Toast sin recargar la página', async () => {
    mockActualizarMutateAsync.mockRejectedValue({
      response: { data: { message: 'No se puede reabrir una incidencia resuelta' } },
    });

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /editar incidencia TRK-20260605-BBBB2222/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se puede reabrir una incidencia resuelta/i);
    });
  });
});
