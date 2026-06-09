interface DateRangePickerProps {
  desde: string;
  hasta: string;
  onChange: (range: { desde: string; hasta: string }) => void;
}

export function DateRangePicker({ desde, hasta, onChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="fecha-desde" className="text-sm font-medium text-gray-700">
          Desde
        </label>
        <input
          id="fecha-desde"
          type="date"
          value={desde}
          aria-label="Fecha desde"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange({ desde: e.target.value, hasta })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="fecha-hasta" className="text-sm font-medium text-gray-700">
          Hasta
        </label>
        <input
          id="fecha-hasta"
          type="date"
          value={hasta}
          aria-label="Fecha hasta"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange({ desde, hasta: e.target.value })}
        />
      </div>
    </div>
  );
}
