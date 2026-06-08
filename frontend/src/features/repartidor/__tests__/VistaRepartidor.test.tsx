import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VistaRepartidor } from '../VistaRepartidor';
import type { EntregasAgrupadasDto } from '@/types/entregaTypes';

const mockEntregas: EntregasAgrupadasDto = {
  pendientes: [
    {
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260607-AAAA1111',
      estado: 'EN_RUTA',
      destinatario: 'María López',
      direccionDestino: 'Calle 123',
      rutaId: 'ruta-1',
      updatedAt: '2026-06-07T10:00:00.000Z',
    },
  ],
  completadas: [
    {
      id: 'envio-2',
      codigoSeguimiento: 'TRK-20260607-BBBB2222',
      estado: 'ENTREGADO',
      destinatario: 'Pedro Ruiz',
      direccionDestino: 'Avenida 456',
      rutaId: 'ruta-1',
      updatedAt: '2026-06-06T15:00:00.000Z',
    },
  ],
};

let mockUseEntregasReturn: {
  data: EntregasAgrupadasDto | undefined;
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useEntregas', () => ({
  useEntregas: () => mockUseEntregasReturn,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/repartidor/entregas']}>
        <VistaRepartidor />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEntregasReturn = { data: mockEntregas, isLoading: false, isError: false };
});

describe('R26 — VistaRepartidor: pestañas Pendientes/Completadas con entregas agrupadas', () => {
  it('debe renderizar las pestañas con el conteo y las entregas pendientes', () => {
    renderWithProviders();

    expect(screen.getByRole('heading', { name: 'Mis Entregas' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Pendientes \(1\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Completadas/i })).toBeInTheDocument();

    // La pestaña por defecto (pendientes) muestra el envío pendiente.
    expect(screen.getByText('TRK-20260607-AAAA1111')).toBeInTheDocument();
    expect(screen.getByText('Calle 123')).toBeInTheDocument();
  });

  it('debe mostrar las entregas completadas al cambiar de pestaña', () => {
    renderWithProviders();

    fireEvent.click(screen.getByRole('tab', { name: /Completadas/i }));

    expect(screen.getByText('TRK-20260607-BBBB2222')).toBeInTheDocument();
    expect(screen.getByText('Avenida 456')).toBeInTheDocument();
  });
});

describe('R32 — VistaRepartidor: navegación a la pantalla de confirmación', () => {
  it('debe navegar a la confirmación al seleccionar una entrega pendiente', () => {
    renderWithProviders();

    fireEvent.click(
      screen.getByRole('button', { name: /Confirmar entrega TRK-20260607-AAAA1111/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith('/repartidor/entregas/envio-1/confirmar');
  });
});
