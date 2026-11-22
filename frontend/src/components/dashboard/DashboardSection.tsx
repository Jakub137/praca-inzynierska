import { type ReactNode, useId } from "react";

type DashboardSectionProps = {
  title: string;
  // Link in the header, e.g. "Wszystkie (42) →"; shown only when there is something to link to.
  action?: ReactNode;
  children: ReactNode;
};

export function DashboardSection({
  title,
  action,
  children,
}: DashboardSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
