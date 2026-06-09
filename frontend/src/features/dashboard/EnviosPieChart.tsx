import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { DashboardMetricsDto } from '@/types/dashboard';

interface EnviosPieChartProps {
  metrics: DashboardMetricsDto | undefined;
}

const COLORS = {
  enRuta: '#3b82f6',
  entregados: '#22c55e',
  otros: '#9ca3af',
};

export function EnviosPieChart({ metrics }: EnviosPieChartProps) {
  if (!metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-full bg-gray-200" role="status" aria-label="Cargando gráfico" />
      </div>
    );
  }

  const { enRuta, entregados, totalEnvios } = metrics;
  const otros = Math.max(0, totalEnvios - enRuta - entregados);

  const chartData = [
    { name: 'En Ruta', value: enRuta, color: COLORS.enRuta },
    { name: 'Entregados', value: entregados, color: COLORS.entregados },
    { name: 'Otros', value: otros, color: COLORS.otros },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          label={({ name, percent }: PieLabelRenderProps) =>
            `${name ?? ''} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`
          }
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
