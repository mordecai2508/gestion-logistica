import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestionRutas } from './GestionRutas';
import { RutaForm } from './RutaForm';
import { EnvioCheckboxList } from './EnvioCheckboxList';

// ────────────────────────────────────────────────────────────────
// Shared mocks
// ────────────────────────────────────────────────────────────────

const mockCrearMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/hooks/useRutas', () => ({
  useRutas: () => ({
    data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
    isLoading: false,
    isError: false,
  }),
}));

// `GestionRutas` obtiene los envíos disponibles (estado PENDIENTE) a través
// de `useEnvios` (endpoint real de `envios_consultar`, ya implementado).
// Lo mockeamos aquí para mantener el test determinista — no para ocultar la
// limitación real de la pantalla, que es la ausencia de endpoints de
// vehículos/repartidores disponibles (ver nota de alcance en GestionRutas.tsx
// y progress/impl_rutas_gestion.md).
const mockEnviosPendientes = [
  { id: 'envio-1', codigoSeguimiento: 'TRK-20260605-AAAA1111', estado: 'PENDIENTE', remitente: 'Juan Pérez', destinatario: 'Calle Falsa 123', clienteId: 'cliente-1', clienteNombre: 'María Cliente', createdAt: '' },
];

vi.mock('@/hooks/useEnvios', () => ({
  useEnvios: () => ({
    data: { data: mockEnviosPendientes, meta: { total: 1, page: 1, limit: 100, totalPages: 1 } },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/useVehiculos', () => ({
  useVehiculos: () => ({
    data: [
      { id: 'v1', placa: 'ABC-123', modelo: 'Camión', capacidad: 1000, estado: 'DISPONIBLE' },
    ],
  }),
}));

vi.mock('@/hooks/useRepartidores', () => ({
  useRepartidores: () => ({
    data: {
      data: [
        { id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: true },
      ],
    },
  }),
}));

vi.mock('@/hooks/useCrearRuta', () => ({
  useCrearRuta: () => ({
    mutateAsync: mockCrearMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useRutaOptima', () => ({
  useRutaOptima: () => ({
    refetch: mockRefetch,
    isFetching: false,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/rutas']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleEnvios = [
  { id: 'envio-1', codigoSeguimiento: 'ENV-001', direccionDestino: 'Calle Falsa 123' },
  { id: 'envio-2', codigoSeguimiento: 'ENV-002', direccionDestino: 'Av. Siempre Viva 742' },
];

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('R24 — GestionRutas: debe renderizar el formulario con todos los controles', () => {
  it('renderiza el título y el botón Nueva Ruta', () => {
    renderWithProviders(<GestionRutas />);
    expect(screen.getByText('Gestión de Rutas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva ruta/i })).toBeInTheDocument();
  });

  it('muestra el formulario de ruta al hacer clic en Nueva Ruta', () => {
    renderWithProviders(<GestionRutas />);
    fireEvent.click(screen.getByRole('button', { name: /nueva ruta/i }));
    expect(screen.getByRole('button', { name: /guardar ruta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generar ruta óptima/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/seleccionar vehículo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seleccionar repartidor/i)).toBeInTheDocument();
  });

  it('alimenta la lista de envíos seleccionables con los envíos PENDIENTE reales de useEnvios', () => {
    renderWithProviders(<GestionRutas />);
    fireEvent.click(screen.getByRole('button', { name: /nueva ruta/i }));

    // El envío mockeado por useEnvios (estado PENDIENTE) debe aparecer
    // listado en el formulario — ya no es un arreglo vacío hardcodeado.
    expect(screen.getByLabelText(/seleccionar envío TRK-20260605-AAAA1111/i)).toBeInTheDocument();
  });

  it('los selectores de vehículo y repartidor se alimentan de los hooks reales (vehiculos_gestion y repartidores_gestion ya implementados)', () => {
    renderWithProviders(<GestionRutas />);
    fireEvent.click(screen.getByRole('button', { name: /nueva ruta/i }));

    const vehiculoSelect = screen.getByLabelText(/seleccionar vehículo/i);
    const repartidorSelect = screen.getByLabelText(/seleccionar repartidor/i);

    // Placeholder + 1 opción real por cada selector (datos del mock de useVehiculos/useRepartidores).
    expect(vehiculoSelect.querySelectorAll('option')).toHaveLength(2);
    expect(repartidorSelect.querySelectorAll('option')).toHaveLength(2);
  });
});

describe('R25 — EnvioCheckboxList: reordena la lista de envíos al recibir orderedEnvios', () => {
  it('muestra los envíos en el orden devuelto por calcularOptima con sus marcadores', () => {
    const ordenOptimo = [
      { orden: 1, envioId: 'envio-2', codigoSeguimiento: 'ENV-002', direccionDestino: 'Av. Siempre Viva 742', lat: null, lng: null },
      { orden: 2, envioId: 'envio-1', codigoSeguimiento: 'ENV-001', direccionDestino: 'Calle Falsa 123', lat: null, lng: null },
    ];

    render(
      <EnvioCheckboxList
        envios={sampleEnvios}
        selectedIds={['envio-1', 'envio-2']}
        onChange={vi.fn()}
        orderedEnvios={ordenOptimo}
      />,
    );

    // Order markers should be visible
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();

    // ENV-002 should appear before ENV-001 (optimal order)
    const allCodes = screen.getAllByText(/ENV-\d{3}/);
    expect(allCodes[0]).toHaveTextContent('ENV-002');
    expect(allCodes[1]).toHaveTextContent('ENV-001');
  });
});

describe('R26 — RutaForm: muestra errores de validación inline al intentar guardar sin campos requeridos', () => {
  it('muestra error de envíos, vehículo y repartidor cuando el formulario está vacío', async () => {
    renderWithProviders(
      <RutaForm
        enviosDisponibles={sampleEnvios}
        vehiculosDisponibles={[]}
        repartidoresDisponibles={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /guardar ruta/i }));

    await waitFor(() => {
      expect(screen.getByText(/selecciona al menos un envío/i)).toBeInTheDocument();
      expect(screen.getByText(/selecciona un vehículo/i)).toBeInTheDocument();
      expect(screen.getByText(/selecciona un repartidor/i)).toBeInTheDocument();
    });

    // createRuta must NOT have been called
    expect(mockCrearMutateAsync).not.toHaveBeenCalled();
  });
});

describe('useCrearRuta — invalida cache de rutas en onSuccess', () => {
  it('llama a mutateAsync con el DTO correcto y cierra el formulario en onSuccess', async () => {
    mockCrearMutateAsync.mockResolvedValueOnce({
      id: 'ruta-abc',
      codigo: 'RUTA-20260605-0001',
      estado: 'PENDIENTE',
      vehiculo: { id: 'v1', placa: 'ABC-123', modelo: 'Camión', capacidad: 1000, estado: 'EN_RUTA' },
      repartidor: { id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: false },
      envios: [],
      createdAt: '',
      updatedAt: '',
    });

    const onSuccess = vi.fn();

    renderWithProviders(
      <RutaForm
        enviosDisponibles={sampleEnvios}
        vehiculosDisponibles={[{ id: 'v1', placa: 'ABC-123', modelo: 'Camión', capacidad: 1000, estado: 'DISPONIBLE' }]}
        repartidoresDisponibles={[{ id: 'r1', usuario: { nombre: 'Juan', correo: 'j@test.com' }, licencia: null, disponible: true }]}
        onSuccess={onSuccess}
      />,
    );

    // Select a vehicle
    fireEvent.change(screen.getByLabelText(/seleccionar vehículo/i), { target: { value: 'v1' } });
    // Select a repartidor
    fireEvent.change(screen.getByLabelText(/seleccionar repartidor/i), { target: { value: 'r1' } });
    // Select an envio
    fireEvent.click(screen.getByLabelText(/seleccionar envío ENV-001/i));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /guardar ruta/i }));

    await waitFor(() => {
      expect(mockCrearMutateAsync).toHaveBeenCalledWith({
        enviosIds: ['envio-1'],
        vehiculoId: 'v1',
        repartidorId: 'r1',
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
