type MetricCardSkeletonProps = {
  // Name of the card, read as "Ładowanie: …".
  label: string;
};

export function MetricCardSkeleton({ label }: MetricCardSkeletonProps) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4"
    >
      <span className="sr-only">{`Ładowanie: ${label}`}</span>
      <div
        aria-hidden="true"
        className="h-4 w-1/2 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-8 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-4 w-1/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
      />
    </div>
  );
}
