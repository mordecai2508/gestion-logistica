import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestionUsuarios } from './GestionUsuarios';
import type { UsuarioDto, ListaUsuariosDto } from '@/types/usuarioTypes';

// ────────────────────────────────────────────────────────────────
// Shared fixtures
// ────────────────────────────────────────────────────────────────

const mockUsuarios: UsuarioDto[] = [
  {
    id: 'user-op-1',
    nombre: 'Olga Operadora',
    correo: 'olga@example.com',
    rol: 'OPERADOR',
    telefono: '3001112222',
    activo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-cli-1',
    nombre: 'Carlos Cliente',
    correo: 'carlos@example.com',
    rol: 'CLIENTE',
    telefono: '3003334444',
    activo: false,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

let mockUseUsuariosReturn: {
  data: ListaUsuariosDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const mockUseUsuarios = vi.fn();
const mockActualizarMutateAsync = vi.fn();

vi.mock('@/hooks/useUsuarios', () => ({
  useUsuarios: (filtros: Record<string, unknown>) => {
    mockUseUsuarios(filtros);
    return mockUseUsuariosReturn;
  },
  useUsuario: () => ({ data: undefined, isLoading: false, isError: false }),
  useActualizarEstadoUsuario: () => ({
    mutateAsync: mockActualizarMutateAsync,
    isPending: false,
  }),
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
      <MemoryRouter initialEntries={['/usuarios']}>
        <GestionUsuarios />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUsuariosReturn = {
    data: {
      data: mockUsuarios,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

// ────────────────────────────────────────────────────────────────
// R22 — Título de la página
// ────────────────────────────────────────────────────────────────

describe('R22 — renderiza la página con título "Gestión de Usuarios"', () => {
  it('muestra el heading principal con el título correcto', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { name: 'Gestión de Usuarios' }),
    ).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R23 — Columnas de la tabla
// ────────────────────────────────────────────────────────────────

describe('R23 — muestra columnas Nombre, Correo, Rol, Estado en la tabla', () => {
  it('renderiza los encabezados de columna requeridos', () => {
    renderScreen();

    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Correo')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('renderiza los datos de los usuarios en la tabla', () => {
    renderScreen();

    expect(screen.getByText('Olga Operadora')).toBeInTheDocument();
    expect(screen.getByText('olga@example.com')).toBeInTheDocument();
    expect(screen.getByText('Carlos Cliente')).toBeInTheDocument();
    expect(screen.getByText('carlos@example.com')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R24 — Filtro por rol
// ────────────────────────────────────────────────────────────────

describe('R24 — el filtro por rol re-ejecuta la query con el parámetro correcto', () => {
  it('llama a useUsuarios con rol=CLIENTE al seleccionar "CLIENTE"', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por rol/i), {
      target: { value: 'CLIENTE' },
    });

    await waitFor(() => {
      expect(mockUseUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({ rol: 'CLIENTE' }),
      );
    });
  });

  it('llama a useUsuarios sin rol al seleccionar "Todos"', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/filtrar por rol/i), {
      target: { value: 'OPERADOR' },
    });
    fireEvent.change(screen.getByLabelText(/filtrar por rol/i), {
      target: { value: 'todos' },
    });

    await waitFor(() => {
      const lastCall = mockUseUsuarios.mock.calls[mockUseUsuarios.mock.calls.length - 1][0];
      expect(lastCall).not.toHaveProperty('rol');
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R25 — Panel de detalle al hacer clic en "Ver"
// ────────────────────────────────────────────────────────────────

describe('R25 — al hacer clic en "Ver" se muestra el panel de detalle con los datos del usuario', () => {
  it('abre el panel de detalle con la información del usuario seleccionado', async () => {
    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /ver detalle de Olga Operadora/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /detalle de Olga Operadora/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText('olga@example.com').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('3001112222')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R26 — Botón Activar/Desactivar según estado
// ────────────────────────────────────────────────────────────────

describe('R26 — el botón de acción muestra "Activar" para usuarios inactivos y "Desactivar" para usuarios activos', () => {
  it('muestra "Desactivar" para un usuario activo y "Activar" para uno inactivo', () => {
    renderScreen();

    expect(screen.getByRole('button', { name: /desactivar Olga Operadora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activar Carlos Cliente/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R27 — Toggle de estado llama al servicio y muestra toast de éxito
// ────────────────────────────────────────────────────────────────

describe('R27 — al hacer clic en "Desactivar"/"Activar" se llama al servicio PATCH y se muestra toast de éxito', () => {
  it('llama a actualizarEstado.mutateAsync con el valor invertido y muestra toast de éxito', async () => {
    mockActualizarMutateAsync.mockResolvedValue({
      ...mockUsuarios[0],
      activo: false,
    });

    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /desactivar Olga Operadora/i }),
    );

    await waitFor(() => {
      expect(mockActualizarMutateAsync).toHaveBeenCalledWith({
        id: 'user-op-1',
        dto: { activo: false },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/desactivado correctamente/i);
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R28 — Error 409 al auto-desactivarse muestra toast de error
// ────────────────────────────────────────────────────────────────

describe('R28 — si la API responde 409 (auto-desactivación) se muestra un toast de error con el mensaje recibido', () => {
  it('muestra el mensaje de error devuelto por la API sin modificar la tabla', async () => {
    mockActualizarMutateAsync.mockRejectedValue({
      response: { data: { message: 'No puedes desactivar tu propia cuenta' } },
    });

    renderScreen();

    fireEvent.click(
      screen.getByRole('button', { name: /desactivar Olga Operadora/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no puedes desactivar tu propia cuenta/i);
    });

    // Table state unchanged — Olga is still shown as "Activo"
    expect(screen.getByRole('button', { name: /desactivar Olga Operadora/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R29 — Indicador de carga
// ────────────────────────────────────────────────────────────────

describe('R29 — muestra indicador de carga mientras se obtiene la lista', () => {
  it('muestra el texto de carga cuando isLoading es true y deshabilita el filtro', () => {
    mockUseUsuariosReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    };

    renderScreen();

    expect(screen.getByText(/cargando usuarios/i)).toBeInTheDocument();

    const filtro = screen.getByLabelText(/filtrar por rol/i);
    expect(filtro).toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────
// R30 — Mensaje de error con botón de reintento
// ────────────────────────────────────────────────────────────────

describe('R30 — muestra mensaje de error si la API falla, con botón "Reintentar"', () => {
  it('muestra el mensaje de error y el botón "Reintentar" cuando isError es true', () => {
    mockUseUsuariosReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    };

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent(/error al cargar los usuarios/i);
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R31 — Controles de paginación
// ────────────────────────────────────────────────────────────────

describe('R31 — muestra controles de paginación cuando meta.totalPages > 1', () => {
  it('muestra los botones Anterior/Siguiente cuando hay más de una página', () => {
    mockUseUsuariosReturn = {
      data: {
        data: mockUsuarios,
        meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderScreen();

    expect(screen.getByRole('button', { name: /página anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /página siguiente/i })).toBeInTheDocument();
  });

  it('no muestra controles de paginación cuando solo hay una página', () => {
    renderScreen();

    expect(screen.queryByRole('button', { name: /página anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /página siguiente/i })).not.toBeInTheDocument();
  });
});
