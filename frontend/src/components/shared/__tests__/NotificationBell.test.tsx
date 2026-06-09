import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from '../NotificationBell';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useUnreadCount', () => ({
  useUnreadCount: () => mockUnreadCount(),
}));

let mockUnreadCount: () => { count: number };

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUnreadCount = () => ({ count: 0 });
});

// ─────────────────────────────────────────────────────────────────
// R22 — badge shows correct unread count from useUnreadCount
// ─────────────────────────────────────────────────────────────────

describe('R22 — NotificationBell: badge muestra el conteo no leído de useUnreadCount', () => {
  it('debe mostrar el badge con el número cuando count > 0', () => {
    mockUnreadCount = () => ({ count: 5 });
    renderBell();

    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
  });

  it('debe ocultar el badge cuando count === 0', () => {
    mockUnreadCount = () => ({ count: 0 });
    renderBell();

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('debe mostrar "99+" cuando count supera 99', () => {
    mockUnreadCount = () => ({ count: 100 });
    renderBell();

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('debe mostrar "99+" cuando count es exactamente 100', () => {
    mockUnreadCount = () => ({ count: 100 });
    renderBell();

    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });

  it('debe mostrar el número exacto cuando count es 99', () => {
    mockUnreadCount = () => ({ count: 99 });
    renderBell();

    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  it('debe navegar a /notificaciones al hacer clic en el botón', () => {
    renderBell();

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(mockNavigate).toHaveBeenCalledWith('/notificaciones');
  });
});
