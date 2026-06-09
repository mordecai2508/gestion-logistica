import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
}

export function MetricCard({ label, value, isLoading }: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            className="h-8 w-16 animate-pulse rounded bg-gray-200"
            aria-label="Cargando"
            role="status"
          />
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
