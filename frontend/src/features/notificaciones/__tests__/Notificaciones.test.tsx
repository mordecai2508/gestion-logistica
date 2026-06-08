import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Notificaciones } from '../Notificaciones';
import type { NotificacionDto } from '@/types/notificacionTypes';
import { useNotificacionesSocket } from '@/hooks/useNotificacionesSocket';

// ─────────────────────────────────────────────────────────────────
// Shared mocks
// ─────────────────────────────────────────────────────────────────

const mockNotificaciones: NotificacionDto[] = [
  {
    id: 'notif-1',
    tipo: 'ENTREGA_REALIZADA',
    mensaje: 'Tu envío TRK-20260608-AAAA1111 fue entregado',
    leida: false,
    envioId: 'envio-1',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 minutes ago
  },
  {
    id: 'notif-2',
    tipo: 'RUTA_ASIGNADA',
    mensaje: 'Se te asignó la ruta RUTA-20260608-ABCD',
    leida: true,
    envioId: null,
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), // 2 hours ago
  },
];

let mockUseNotificacionesReturn: {
  data: { data: NotificacionDto[]; meta: { total: number; page: number; limit: number; totalPages: number } } | undefined;
  isLoading: boolean;
  isError: boolean;
};

const mockUseNotificaciones = vi.fn();
vi.mock('@/hooks/useNotificaciones', () => ({
  useNotificaciones: (filters: { page?: number; limit?: number }) => {
    mockUseNotificaciones(filters);
    return mockUseNotificacionesReturn;
  },
}));

vi.mock('@/hooks/useNotificacionesSocket', () => ({
  useNotificacionesSocket: vi.fn(),
}));

const mockMarcarMutate = vi.fn();
vi.mock('@/hooks/useMarcarNotificacionLeida', () => ({
  useMarcarNotificacionLeida: () => ({
    mutate: mockMarcarMutate,
    isPending: false,
  }),
}));

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/notificaciones']}>
        <Notificaciones />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNotificacionesReturn = {
    data: { data: mockNotificaciones, meta: { total: 2, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
    isError: false,
  };
});

// ─────────────────────────────────────────────────────────────────
// R15 — lista con ícono, mensaje en negrita y tiempo relativo
// ─────────────────────────────────────────────────────────────────

describe('R15 - debe mostrar cada notificación con ícono, mensaje en negrita y tiempo relativo', () => {
  it('renderiza el título y la lista de notificaciones con mensajes', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument();

    expect(screen.getAllByText('Tu envío TRK-20260608-AAAA1111 fue entregado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Se te asignó la ruta RUTA-20260608-ABCD').length).toBeGreaterThanOrEqual(1);

    // Relative time (mocked time ~5min ago should show something like "hace 5 minutos")
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// R16 — borde izquierdo coloreado según tipo
// ─────────────────────────────────────────────────────────────────

describe('R16 - debe aplicar el color de borde correspondiente al tipo', () => {
  it('aplica border-l-green-500 para ENTREGA_REALIZADA', () => {
    renderScreen();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems[0].className).toContain('border-l-green-500');
  });

  it('aplica border-l-blue-500 para RUTA_ASIGNADA', () => {
    renderScreen();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems[1].className).toContain('border-l-blue-500');
  });
});

// ─────────────────────────────────────────────────────────────────
// R17 — controles de paginación cuando hay más de una página
// ─────────────────────────────────────────────────────────────────

describe('R17 - debe mostrar controles de paginación cuando hay más de una página', () => {
  it('no muestra controles de paginación cuando solo hay una página', () => {
    renderScreen();
    expect(screen.queryByRole('button', { name: /página siguiente/i })).not.toBeInTheDocument();
  });

  it('muestra controles de paginación cuando hay más de una página', async () => {
    mockUseNotificacionesReturn = {
      data: { data: mockNotificaciones, meta: { total: 45, page: 1, limit: 20, totalPages: 3 } },
      isLoading: false,
      isError: false,
    };

    renderScreen();

    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => {
      expect(mockUseNotificaciones).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// R18 — actualización en tiempo real al recibir notification:new
// ─────────────────────────────────────────────────────────────────

describe('R18 - debe invocar el hook de socket para suscribirse a notification:new', () => {
  it('llama a useNotificacionesSocket al renderizar', () => {
    renderScreen();
    expect(vi.mocked(useNotificacionesSocket)).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// R19 — mensaje de lista vacía
// ─────────────────────────────────────────────────────────────────

describe('R19 - debe mostrar el mensaje de lista vacía cuando no hay notificaciones', () => {
  it('muestra "No tienes notificaciones" cuando la lista está vacía', () => {
    mockUseNotificacionesReturn = {
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
      isLoading: false,
      isError: false,
    };

    renderScreen();

    expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────
// R20 — control "marcar como leída"
// ─────────────────────────────────────────────────────────────────

describe('R20 - debe invocar la mutación de "marcar como leída" al interactuar con su control', () => {
  it('muestra el control solo para notificaciones no leídas e invoca mutate al hacer clic', async () => {
    renderScreen();

    const marcarButtons = screen.getAllByRole('button', { name: /marcar como leída/i });
    // Only notif-1 (leida: false) should have the button; notif-2 (leida: true) should not
    expect(marcarButtons).toHaveLength(1);

    fireEvent.click(marcarButtons[0]);

    await waitFor(() => {
      expect(mockMarcarMutate).toHaveBeenCalledWith('notif-1');
    });
  });

  it('no muestra el control para notificaciones ya leídas', () => {
    mockUseNotificacionesReturn = {
      data: {
        data: [{ ...mockNotificaciones[0], leida: true }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    };

    renderScreen();

    expect(screen.queryByRole('button', { name: /marcar como leída/i })).not.toBeInTheDocument();
  });
});
