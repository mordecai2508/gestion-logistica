import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RepartidorBottomNav } from '../RepartidorBottomNav';

function renderBottomNav(initialPath = '/repartidor/entregas') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RepartidorBottomNav />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────
// R24 — bottom nav renders 4 tabs; active style on current route
// ─────────────────────────────────────────────────────────────────

describe('R24 — RepartidorBottomNav: renderiza 4 tabs y aplica estilo activo al tab de la ruta actual', () => {
  it('renderiza los 4 tabs de navegación', () => {
    renderBottomNav('/repartidor/entregas');

    expect(screen.getByRole('link', { name: /Rutas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Entregas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mapa/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Perfil/i })).toBeInTheDocument();
  });

  it('aplica la clase activa (bottom-nav-active) al tab de la ruta actual (/repartidor/entregas)', () => {
    renderBottomNav('/repartidor/entregas');

    const entregasLink = screen.getByRole('link', { name: /Entregas/i });
    expect(entregasLink.className).toContain('bottom-nav-active');
  });

  it('aplica la clase activa al tab de Rutas cuando la ruta es /repartidor/rutas', () => {
    renderBottomNav('/repartidor/rutas');

    const rutasLink = screen.getByRole('link', { name: /Rutas/i });
    expect(rutasLink.className).toContain('bottom-nav-active');
  });

  it('aplica la clase activa al tab de Perfil cuando la ruta es /perfil', () => {
    renderBottomNav('/perfil');

    const perfilLink = screen.getByRole('link', { name: /Perfil/i });
    expect(perfilLink.className).toContain('bottom-nav-active');
  });

  it('no aplica la clase activa a tabs que no coinciden con la ruta actual', () => {
    renderBottomNav('/repartidor/entregas');

    const rutasLink = screen.getByRole('link', { name: /Rutas/i });
    const mapaLink = screen.getByRole('link', { name: /Mapa/i });
    const perfilLink = screen.getByRole('link', { name: /Perfil/i });

    expect(rutasLink.className).not.toContain('bottom-nav-active');
    expect(mapaLink.className).not.toContain('bottom-nav-active');
    expect(perfilLink.className).not.toContain('bottom-nav-active');
  });
});
