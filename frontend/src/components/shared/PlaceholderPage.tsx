interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-lg text-gray-500">Próximamente — {title}</p>
    </div>
  );
}
