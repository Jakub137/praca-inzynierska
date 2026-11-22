const SKELETON_ROW_COUNT = 4;
const SKELETON_ROWS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => index,
);

export function RecurringPaymentsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Ładowanie płatności cyklicznych</span>
      <div
        aria-hidden="true"
        className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4"
      >
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className="h-5 w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
