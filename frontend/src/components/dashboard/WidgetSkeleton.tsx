type WidgetSkeletonProps = {
  // Phrase read as "Ładowanie: …", e.g. "ostatnich transakcji".
  label: string;
  rowCount: number;
};

export function WidgetSkeleton({ label, rowCount }: WidgetSkeletonProps) {
  const rows = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <div role="status">
      <span className="sr-only">{`Ładowanie: ${label}`}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row}
            className="h-10 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
