import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  // Small line under the value: the change, the limit, the goal progress.
  children?: ReactNode;
};

export function MetricCard({ label, value, children }: MetricCardProps) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-card p-4">
      <h2 className="text-sm font-medium text-muted">{label}</h2>
      <p className="wrap-break-word text-2xl font-semibold text-ink">{value}</p>
      {children}
    </article>
  );
}
