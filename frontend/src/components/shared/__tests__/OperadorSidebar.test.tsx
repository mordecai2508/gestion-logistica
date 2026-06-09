import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OperadorSidebar } from '../OperadorSidebar';

function renderSidebar(
  props: { isOpen?: boolean; onClose?: () => void } = {},
  initialPath = '/rutas',
) {
  const onClose = props.onClose ?? vi.fn();
  const isOpen = props.isOpen ?? false;

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OperadorSidebar isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────
// R20 — sidebar renders all 7 links; active class on current route
// ─────────────────────────────────────────────────────────────────

describe('R20 — OperadorSidebar: renderiza 7 enlaces y aplica clase activa al enlace de la ruta actual', () => {
  it('renderiza los 7 enlaces de navegación en el sidebar de escritorio', () => {
    renderSidebar({}, '/rutas');

    const expectedLabels = [
      'Dashboard',
      'Envíos',
      'Rutas',
      'Vehículos',
      'Incidencias',
      'Reportes',
      'Usuarios',
    ];

    for (const label of expectedLabels) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('aplica la clase activa (sidebar-link-active) al enlace que coincide con la ruta actual', () => {
    renderSidebar({}, '/rutas');

    const desktopLinks = screen.getAllByRole('link', { name: 'Rutas' });
    const activeLink = desktopLinks.find((el) => el.className.includes('sidebar-link-active'));
    expect(activeLink).toBeDefined();
  });

  it('no aplica la clase activa a un enlace que no coincide con la ruta actual', () => {
    renderSidebar({}, '/rutas');

    const enviosLinks = screen.getAllByRole('link', { name: 'Envíos' });
    const inactiveLink = enviosLinks.find((el) =>
      el.className.includes('sidebar-link-active'),
    );
    expect(inactiveLink).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// R21 — mobile: sidebar hidden; hamburger in topbar (OperadorLayout)
// For OperadorSidebar itself: the desktop aside uses "hidden ... md:flex"
// ─────────────────────────────────────────────────────────────────

describe('R21 — OperadorSidebar: en viewport móvil el aside de escritorio usa clase hidden', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('el aside de escritorio tiene clase "hidden" que lo oculta en mobile', () => {
    renderSidebar({ isOpen: false }, '/dashboard');

    const desktopAside = screen.getByRole('complementary', { name: 'Sidebar' });
    expect(desktopAside.className).toContain('hidden');
  });

  it('cuando isOpen es true, renderiza el panel drawer móvil', () => {
    renderSidebar({ isOpen: true }, '/dashboard');

    const dialog = screen.getByRole('dialog', { name: 'Menú de navegación' });
    expect(dialog).toBeInTheDocument();
  });

  it('cuando isOpen es false, no renderiza el panel drawer móvil', () => {
    renderSidebar({ isOpen: false }, '/dashboard');

    expect(screen.queryByRole('dialog', { name: 'Menú de navegación' })).not.toBeInTheDocument();
  });
});
