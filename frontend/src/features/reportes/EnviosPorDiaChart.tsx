import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EnviosPorDiaChartProps {
  data: { fecha: string; total: number }[];
  isLoading: boolean;
}

export function EnviosPorDiaChart({ data, isLoading }: EnviosPorDiaChartProps) {
  if (isLoading) {
    return (
      <div
        className="h-64 w-full animate-pulse rounded-lg bg-gray-200"
        role="status"
        aria-label="Cargando gráfico de envíos por día"
      />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="total" fill="#3b82f6" name="Envíos" />
      </BarChart>
    </ResponsiveContainer>
  );
}
