import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnviosPieChart } from '../EnviosPieChart';
import type { DashboardMetricsDto } from '@/types/dashboard';

// ────────────────────────────────────────────────────────────────
// Mock recharts so it renders chart data as accessible DOM text.
// ResponsiveContainer collapses to 0×0 in jsdom (no ResizeObserver),
// so real recharts never paints anything. The mock renders the legend
// entries and pie-slice labels as plain <li>/<span> elements so
// Testing Library can find them.
// ────────────────────────────────────────────────────────────────

vi.mock('recharts', () => {
  function ResponsiveContainer({ children }: { children: import('react').ReactNode }) {
    return <div data-testid="recharts-responsive-container">{children}</div>;
  }

  function PieChart({ children }: { children: import('react').ReactNode }) {
    return <div data-testid="recharts-pie-chart">{children}</div>;
  }

  function Pie({ data }: { data: Array<{ name: string; value: number }> }) {
    return (
      <ul data-testid="recharts-pie">
        {(data ?? []).map((entry) => (
          <li key={entry.name} data-testid={`pie-slice-${entry.name}`}>
            {entry.name}
          </li>
        ))}
      </ul>
    );
  }

  function Legend({ payload }: { payload?: Array<{ value: string }> }) {
    if (!payload) return null;
    return (
      <ul data-testid="recharts-legend">
        {payload.map((entry) => (
          <li key={entry.value}>{entry.value}</li>
        ))}
      </ul>
    );
  }

  function Cell({ fill }: { fill: string }) {
    return <span data-fill={fill} />;
  }

  function Tooltip() {
    return null;
  }

  return { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend };
});

// ────────────────────────────────────────────────────────────────
// R26 — EnviosPieChart: renderiza los 3 sectores del gráfico
// ────────────────────────────────────────────────────────────────

describe('R26 — EnviosPieChart debe renderizar los 3 sectores del gráfico circular', () => {
  it('R26 — renderiza "En Ruta", "Entregados" y "Otros" con métricas que producen los 3 sectores', () => {
    const metrics: DashboardMetricsDto = {
      totalEnvios: 10,
      enRuta: 3,
      entregados: 5,
      incidenciasAbiertas: 1,
    };
    // otros = totalEnvios - enRuta - entregados = 10 - 3 - 5 = 2 (> 0)
    // All 3 slices must appear.

    render(<EnviosPieChart metrics={metrics} />);

    expect(screen.getAllByText('En Ruta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entregados').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Otros').length).toBeGreaterThan(0);
  });

  it('R26 — hay exactamente 3 entradas en el gráfico de sectores con los datos de ejemplo', () => {
    const metrics: DashboardMetricsDto = {
      totalEnvios: 10,
      enRuta: 3,
      entregados: 5,
      incidenciasAbiertas: 1,
    };

    render(<EnviosPieChart metrics={metrics} />);

    const slices = screen.getAllByTestId(/^pie-slice-/);
    expect(slices).toHaveLength(3);
  });

  it('R26 — muestra skeleton de carga cuando metrics es undefined', () => {
    render(<EnviosPieChart metrics={undefined} />);

    expect(screen.getByRole('status', { name: 'Cargando gráfico' })).toBeInTheDocument();
  });

  it('R26 — muestra "Sin datos" cuando todos los sectores tienen valor 0', () => {
    const metrics: DashboardMetricsDto = {
      totalEnvios: 0,
      enRuta: 0,
      entregados: 0,
      incidenciasAbiertas: 0,
    };

    render(<EnviosPieChart metrics={metrics} />);

    expect(screen.getByText('Sin datos para mostrar')).toBeInTheDocument();
  });
});
