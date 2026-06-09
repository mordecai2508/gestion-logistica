import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestionRepartidores } from '../GestionRepartidores';
import type { RepartidorDto, ListaRepartidoresDto } from '@/types/repartidorTypes';

// ────────────────────────────────────────────────────────────────
// Shared fixtures
// ────────────────────────────────────────────────────────────────

const mockRepartidores: RepartidorDto[] = [
  {
    id: 'rep-1',
    licencia: 'LIC-ABC-123',
    disponible: true,
    usuario: {
      id: 'u-1',
      nombre: 'Carlos Repartidor',
      correo: 'carlos@example.com',
      telefono: '3001234567',
    },
  },
  {
    id: 'rep-2',
    licencia: null,
    disponible: false,
    usuario: {
      id: 'u-2',
      nombre: 'Ana Mensajera',
      correo: 'ana@example.com',
      telefono: null,
    },
  },
];

let mockUseRepartidoresReturn: {
  data: ListaRepartidoresDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const mockUseRepartidores = vi.fn();
vi.mock('@/hooks/useRepartidores', () => ({
  useRepartidores: (filtros: Record<string, unknown>) => {
    mockUseRepartidores(filtros);
    return mockUseRepartidoresReturn;
  },
  useRepartidor: () => ({ data: undefined, isLoading: false, isError: false }),
  useActualizarRepartidor: () => ({
    mutateAsync: mockActualizarMutateAsync,
    isPending: false,
  }),
}));

const mockActualizarMutateAsync = vi.fn();

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
      <MemoryRouter initialEntries={['/repartidores']}>
        <GestionRepartidores />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRepartidoresReturn = {
    data: {
      data: mockRepartidores,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

// ────────────────────────────────────────────────────────────────
// R16 — Título de la página
// ────────────────────────────────────────────────────────────────

describe('R16 — renderiza la página con título "Gestión de Repartidores"', () => {
  it('muestra el heading principal con el título correcto', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { name: 'Gestión de Repartidores' }),
    ).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R17 — Columnas de la tabla
// ────────────────────────────────────────────────────────────────

describe('R17 — muestra columnas Nombre, Correo, Licencia, Disponibilidad en la tabla', () => {
  it('renderiza los encabezados de columna requeridos', () => {
    renderScreen();

    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Correo')).toBeInTheDocument();
    expect(screen.getByText('Licencia')).toBeInTheDocument();
    expect(screen.getByText('Disponibilidad')).toBeInTheDocument();
  });

  it('renderiza los datos de los repartidores en la tabla', () => {
    renderScreen();

    expect(screen.getByText('Carlos Repartidor')).toBeInTheDocument();
    expect(screen.getByText('carlos@example.com')).toBeInTheDocument();
    expect(screen.getByText('LIC-ABC-123')).toBeInTheDocument();
    expect(screen.getByText('Ana Mensajera')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R18 — Filtro de disponibilidad
// ────────────────────────────────────────────────────────────────

describe('R18 — el filtro de disponibilidad re-ejecuta la query con el parámetro correcto', () => {
  it('llama a useRepartidores con disponible=true al seleccionar "Disponible"', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por disponibilidad/i), {
      target: { value: 'disponible' },
    });

    await waitFor(() => {
      expect(mockUseRepartidores).toHaveBeenCalledWith(
        expect.objectContaining({ disponible: true }),
      );
    });
  });

  it('llama a useRepartidores con disponible=false al seleccionar "No disponible"', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por disponibilidad/i), {
      target: { value: 'no-disponible' },
    });

    await waitFor(() => {
      expect(mockUseRepartidores).toHaveBeenCalledWith(
        expect.objectContaining({ disponible: false }),
      );
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R19 — Panel de detalle al hacer clic en "Ver"
// ────────────────────────────────────────────────────────────────

describe('R19 — al hacer clic en "Ver" se muestra el panel de detalle con los datos del repartidor', () => {
  it('abre el panel de detalle con la información del repartidor seleccionado', async () => {
    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /ver detalle de Carlos Repartidor/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /detalle de Carlos Repartidor/i })).toBeInTheDocument();
    });

    // Both the table row and the detail panel contain the email — use getAllByText
    expect(screen.getAllByText('carlos@example.com').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('LIC-ABC-123').length).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────
// R20 — Formulario de edición pre-llenado al hacer clic en "Editar"
// ────────────────────────────────────────────────────────────────

describe('R20 — al hacer clic en "Editar" se muestra el formulario pre-llenado', () => {
  it('abre el formulario de edición con los valores actuales del repartidor', async () => {
    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /editar Carlos Repartidor/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /editar Carlos Repartidor/i })).toBeInTheDocument();
    });

    const licenciaInput = screen.getByLabelText(/licencia de conducción/i) as HTMLInputElement;
    expect(licenciaInput.value).toBe('LIC-ABC-123');

    const disponibleCheckbox = screen.getByLabelText(/disponible para entregas/i) as HTMLInputElement;
    expect(disponibleCheckbox.checked).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────
// R21 — Submit del formulario llama al servicio y muestra toast
// ────────────────────────────────────────────────────────────────

describe('R21 — al enviar el formulario con datos válidos se llama al servicio PATCH y se muestra toast', () => {
  it('llama a actualizarRepartidor.mutateAsync con los datos correctos y muestra toast de éxito', async () => {
    mockActualizarMutateAsync.mockResolvedValue({
      ...mockRepartidores[0],
      disponible: false,
    });

    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /editar Carlos Repartidor/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /editar Carlos Repartidor/i })).toBeInTheDocument();
    });

    // Toggle disponible to false (currently true)
    fireEvent.click(screen.getByLabelText(/disponible para entregas/i));

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios del repartidor/i }));

    await waitFor(() => {
      expect(mockActualizarMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rep-1' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/actualizado exitosamente/i);
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R22 — Indicador de carga
// ────────────────────────────────────────────────────────────────

describe('R22 — muestra indicador de carga mientras se obtiene la lista', () => {
  it('muestra el texto de carga cuando isLoading es true y deshabilita el filtro', () => {
    mockUseRepartidoresReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    };

    renderScreen();

    expect(screen.getByText(/cargando repartidores/i)).toBeInTheDocument();

    const filtro = screen.getByLabelText(/filtrar por disponibilidad/i);
    expect(filtro).toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────
// R23 — Mensaje de error con botón de reintento
// ────────────────────────────────────────────────────────────────

describe('R23 — muestra mensaje de error si la API falla', () => {
  it('muestra el mensaje de error y el botón "Reintentar" cuando isError es true', () => {
    mockUseRepartidoresReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    };

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent(/error al cargar los repartidores/i);
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});
