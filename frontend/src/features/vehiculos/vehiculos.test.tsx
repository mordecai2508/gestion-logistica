import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestionVehiculos } from './GestionVehiculos';
import { VehiculoForm } from './VehiculoForm';
import { ActualizarEstadoVehiculo } from './ActualizarEstadoVehiculo';
import { VehiculoTable } from './VehiculoTable';
import type { VehiculoDto } from '@/types/vehiculoTypes';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockVehiculos: VehiculoDto[] = [
  { id: 'vehiculo-1', placa: 'ABC-123', modelo: 'Toyota Hilux', capacidad: 1000, estado: 'DISPONIBLE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'vehiculo-2', placa: 'XYZ-789', modelo: 'Chevrolet NPR', capacidad: 2000, estado: 'EN_RUTA', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'vehiculo-3', placa: 'DEF-456', modelo: 'Ford Transit', capacidad: 1500, estado: 'MANTENIMIENTO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

let mockUseVehiculosReturn: { data: VehiculoDto[] | undefined; isLoading: boolean; isError: boolean };

vi.mock('@/hooks/useVehiculos', () => ({
  useVehiculos: (filters: { estado?: string }) => {
    if (filters?.estado !== undefined) {
      return {
        data: mockVehiculos.filter((v) => v.estado === filters.estado),
        isLoading: false,
        isError: false,
      };
    }
    return mockUseVehiculosReturn;
  },
}));

const mockCrearMutateAsync = vi.fn();
vi.mock('@/hooks/useCrearVehiculo', () => ({
  useCrearVehiculo: () => ({
    mutateAsync: mockCrearMutateAsync,
    isPending: false,
  }),
}));

const mockActualizarMutateAsync = vi.fn();
vi.mock('@/hooks/useActualizarEstadoVehiculo', () => ({
  useActualizarEstadoVehiculo: () => ({
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/vehiculos']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseVehiculosReturn = { data: mockVehiculos, isLoading: false, isError: false };
});

// ────────────────────────────────────────────────────────────────
// R16 — Pantalla de gestión de vehículos
// ────────────────────────────────────────────────────────────────

describe('R16 — GestionVehiculos: debe renderizar la pantalla con título, tabla y controles del wireframe', () => {
  it('renderiza el título "Vehículos", la tabla con sus columnas y los controles principales', () => {
    renderWithProviders(<GestionVehiculos />);

    expect(screen.getByRole('heading', { name: 'Vehículos' })).toBeInTheDocument();

    // Columns
    expect(screen.getByText('Placa')).toBeInTheDocument();
    expect(screen.getByText('Modelo')).toBeInTheDocument();
    expect(screen.getByText('Capacidad')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();

    // Status badges (presentation labels) — also appear as filter options, so use getAllByText
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ocupado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mantenimiento').length).toBeGreaterThan(0);

    // Actions
    expect(screen.getByRole('button', { name: /\+ Registrar Vehículo/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /actualizar estado/i }).length).toBeGreaterThan(0);

    // Filter control
    expect(screen.getByLabelText(/filtrar por estado/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────
// R17 — Validación inline en el formulario de registro
// ────────────────────────────────────────────────────────────────

describe('R17 — VehiculoForm: debe mostrar errores de validación inline al enviar campos inválidos', () => {
  it('muestra mensajes de validación junto a cada campo inválido sin enviar el formulario', async () => {
    render(<VehiculoForm />);

    fireEvent.click(screen.getByRole('button', { name: /registrar vehículo/i }));

    await waitFor(() => {
      expect(screen.getByText(/la placa es requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/el modelo es requerido/i)).toBeInTheDocument();
    });

    expect(mockCrearMutateAsync).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────
// R18 — Actualizar estado y reflejar el cambio sin recargar
// ────────────────────────────────────────────────────────────────

describe('R18 — ActualizarEstadoVehiculo: debe enviar la actualización de estado y reflejar el resultado', () => {
  const vehiculo: VehiculoDto = mockVehiculos[0];

  it('envía la solicitud de actualización con el nuevo estado seleccionado', async () => {
    mockActualizarMutateAsync.mockResolvedValue({ ...vehiculo, estado: 'MANTENIMIENTO' });
    const onClose = vi.fn();

    render(<ActualizarEstadoVehiculo vehiculo={vehiculo} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/seleccionar nuevo estado/i), {
      target: { value: 'MANTENIMIENTO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirmar cambio de estado/i }));

    await waitFor(() => {
      expect(mockActualizarMutateAsync).toHaveBeenCalledWith({ id: vehiculo.id, estado: 'MANTENIMIENTO' });
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('refleja un error de la actualización (p.ej. 422) mediante un Toast sin recargar la página', async () => {
    mockActualizarMutateAsync.mockRejectedValue({
      response: { data: { message: 'El vehículo está asignado a una ruta activa' } },
    });

    render(<ActualizarEstadoVehiculo vehiculo={{ ...vehiculo, estado: 'EN_RUTA' }} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/seleccionar nuevo estado/i), {
      target: { value: 'FUERA_SERVICIO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirmar cambio de estado/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/asignado a una ruta activa/i);
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R19 — Filtro por estado en la pantalla
// ────────────────────────────────────────────────────────────────

describe('R19 — GestionVehiculos: debe mostrar solo los vehículos cuyo estado coincide con el filtro', () => {
  it('filtra la tabla al seleccionar un estado en el control de filtro', async () => {
    renderWithProviders(<GestionVehiculos />);

    // Initially shows all three vehicles
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('XYZ-789')).toBeInTheDocument();
    expect(screen.getByText('DEF-456')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), {
      target: { value: 'MANTENIMIENTO' },
    });

    await waitFor(() => {
      expect(screen.getByText('DEF-456')).toBeInTheDocument();
      expect(screen.queryByText('ABC-123')).not.toBeInTheDocument();
      expect(screen.queryByText('XYZ-789')).not.toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────
// R20 — Placa duplicada: error inline sin limpiar el formulario
// ────────────────────────────────────────────────────────────────

describe('R20 — VehiculoForm: debe mostrar mensaje de placa duplicada sin limpiar el formulario', () => {
  it('muestra un error inline de placa duplicada y conserva los valores ingresados cuando el backend responde 409', async () => {
    mockCrearMutateAsync.mockRejectedValue({
      response: { status: 409, data: { error: 'PLACA_DUPLICADA', message: 'La placa ya está registrada' } },
    });

    render(<VehiculoForm />);

    fireEvent.input(screen.getByLabelText('Placa'), { target: { value: 'ABC-123' } });
    fireEvent.input(screen.getByLabelText('Modelo'), { target: { value: 'Toyota Hilux' } });
    fireEvent.input(screen.getByLabelText('Capacidad'), { target: { value: '1000' } });

    fireEvent.click(screen.getByRole('button', { name: /registrar vehículo/i }));

    await waitFor(() => {
      expect(screen.getByText(/la placa ya está registrada/i)).toBeInTheDocument();
    });

    // Form fields retain their values — not cleared
    expect(screen.getByLabelText('Placa')).toHaveValue('ABC-123');
    expect(screen.getByLabelText('Modelo')).toHaveValue('Toyota Hilux');
    expect(screen.getByLabelText('Capacidad')).toHaveValue(1000);
  });
});

// ────────────────────────────────────────────────────────────────
// VehiculoTable — sanity check on badge rendering
// ────────────────────────────────────────────────────────────────

describe('VehiculoTable — renderiza badges de estado por color/etiqueta', () => {
  it('muestra cada vehículo con su badge de estado correspondiente', () => {
    render(<VehiculoTable vehiculos={mockVehiculos} onActualizarEstado={vi.fn()} />);

    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Ocupado')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
  });
});
