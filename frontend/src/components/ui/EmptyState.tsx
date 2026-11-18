import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionButton?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  actionButton,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-slate-100 px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-2xl text-brand"
      >
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {actionButton ? <div className="mt-2">{actionButton}</div> : null}
    </div>
  );
}
