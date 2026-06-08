import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmacionEntrega } from '../ConfirmacionEntrega';
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
  completadas: [],
};

vi.mock('@/hooks/useEntregas', () => ({
  useEntregas: () => ({ data: mockEntregas, isLoading: false, isError: false }),
}));

const mockConfirmarMutateAsync = vi.fn();
vi.mock('@/hooks/useConfirmarEntrega', () => ({
  useConfirmarEntrega: () => ({
    mutateAsync: mockConfirmarMutateAsync,
    isPending: false,
  }),
}));

const mockFalloMutateAsync = vi.fn();
vi.mock('@/hooks/useRegistrarFallo', () => ({
  useRegistrarFallo: () => ({
    mutateAsync: mockFalloMutateAsync,
    isPending: false,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'envio-1' }),
  };
});

// jsdom no implementa el contexto 2D ni toBlob del canvas: los mockeamos para
// poder simular la captura de firma.
function stubCanvas(): void {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback: BlobCallback) => {
      callback(new Blob(['firma'], { type: 'image/png' }));
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 320,
    height: 160,
    right: 320,
    bottom: 160,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/repartidor/entregas/envio-1/confirmar']}>
        <ConfirmacionEntrega />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function dibujarFirma(): void {
  const canvas = screen.getByLabelText('Área de firma del receptor');
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
  fireEvent.pointerUp(canvas);
}

function adjuntarFoto(): void {
  const input = screen.getByLabelText('Foto evidencia');
  const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubCanvas();
});

describe('R27 — ConfirmacionEntrega: render del wireframe', () => {
  it('debe renderizar código, cliente, control de foto, área de firma y botón CONFIRMAR ENTREGA', () => {
    renderScreen();

    expect(screen.getByText('TRK-20260607-AAAA1111')).toBeInTheDocument();
    expect(screen.getByText(/Cliente: María López/)).toBeInTheDocument();
    expect(screen.getByLabelText('Foto evidencia')).toBeInTheDocument();
    expect(screen.getByLabelText('Área de firma del receptor')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /CONFIRMAR ENTREGA/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reportar incidencia/i }),
    ).toBeInTheDocument();
  });
});

describe('R28 — ConfirmacionEntrega: confirmar y navegar en éxito', () => {
  it('debe llamar a la mutación de confirmar y navegar a Vista Repartidor', async () => {
    mockConfirmarMutateAsync.mockResolvedValue({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260607-AAAA1111',
      estado: 'ENTREGADO',
      evidenciaFoto: '/uploads/x.jpg',
      firma: '/uploads/y.png',
      fechaEntrega: '2026-06-07T10:00:00.000Z',
    });

    renderScreen();
    adjuntarFoto();
    dibujarFirma();
    fireEvent.click(screen.getByRole('button', { name: /CONFIRMAR ENTREGA/i }));

    await waitFor(() => {
      expect(mockConfirmarMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ envioId: 'envio-1', foto: expect.any(File) }),
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/repartidor/entregas');
    });
  });
});

describe('R29 — ConfirmacionEntrega: registrar fallo desde "Reportar incidencia"', () => {
  it('debe llamar a la mutación de fallo y navegar en éxito', async () => {
    mockFalloMutateAsync.mockResolvedValue({
      id: 'envio-1',
      codigoSeguimiento: 'TRK-20260607-AAAA1111',
      estado: 'FALLIDO',
      incidenciaId: 'incidencia-1',
    });

    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Reportar incidencia/i }));

    fireEvent.change(screen.getByLabelText('Motivo de la incidencia'), {
      target: { value: 'Cliente ausente' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Registrar fallo/i }));

    await waitFor(() => {
      expect(mockFalloMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ envioId: 'envio-1', nota: 'Cliente ausente' }),
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/repartidor/entregas');
    });
  });
});

describe('R30 — ConfirmacionEntrega: error sin navegar', () => {
  it('debe mostrar el mensaje de error del backend y permanecer en la pantalla', async () => {
    mockConfirmarMutateAsync.mockRejectedValue({
      response: { data: { message: 'No se puede modificar un envío en estado ENTREGADO' } },
    });

    renderScreen();
    adjuntarFoto();
    dibujarFirma();
    fireEvent.click(screen.getByRole('button', { name: /CONFIRMAR ENTREGA/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se puede modificar un envío/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
