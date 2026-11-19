const SKELETON_ROW_COUNT = 5;
const SKELETON_ROWS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => index,
);

export function TransactionsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Ładowanie transakcji</span>
      <div
        aria-hidden="true"
        className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card"
      >
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="flex h-14 items-center gap-4 px-4">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
