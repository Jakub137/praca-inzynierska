const SKELETON_CARD_COUNT = 3;
const SKELETON_CARDS = Array.from(
  { length: SKELETON_CARD_COUNT },
  (_, index) => index,
);

export function GoalsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Ładowanie celów</span>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {SKELETON_CARDS.map((card) => (
          <div
            key={card}
            className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4"
          >
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            <div className="h-2 w-full animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
