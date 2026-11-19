import Link from "next/link";
import { FOCUS_RING } from "@/lib/focusRing";
import { getPageItems } from "@/lib/pagination";
import {
  buildTransactionsHref,
  FIRST_PAGE,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import type { PageResponse, TransactionResponse } from "@/types/api";

const CONTROL =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium";
const LINK = `${CONTROL} border border-slate-300 text-ink hover:bg-slate-100 ${FOCUS_RING}`;
const UNAVAILABLE = `${CONTROL} border border-line text-slate-400`;
const CURRENT = `${CONTROL} bg-brand text-white`;

type TransactionsPaginationProps = {
  filters: TransactionFilters;
  result: PageResponse<TransactionResponse>;
};

type StepLinkProps = {
  label: string;
  // Null when there is no such page: a plain grey label instead of a link.
  href: string | null;
};

function StepLink({ label, href }: StepLinkProps) {
  if (href === null) {
    return <span className={UNAVAILABLE}>{label}</span>;
  }
  return (
    <Link href={href} className={LINK}>
      {label}
    </Link>
  );
}

function PageSummary({
  result,
}: {
  result: PageResponse<TransactionResponse>;
}) {
  const first = result.page * result.size + 1;
  const last = first + result.content.length - 1;
  return (
    <p aria-live="polite" className="text-sm text-muted">
      {`Pokazano ${first}–${last} z ${result.totalElements} transakcji`}
    </p>
  );
}

export function TransactionsPagination({
  filters,
  result,
}: TransactionsPaginationProps) {
  const current = result.page + 1;

  function hrefFor(pageNumber: number): string {
    return buildTransactionsHref({ ...filters, page: pageNumber });
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <PageSummary result={result} />
      {result.totalPages > FIRST_PAGE ? (
        <nav aria-label="Paginacja">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            <li>
              <StepLink
                label="Poprzednia"
                href={current > FIRST_PAGE ? hrefFor(current - 1) : null}
              />
            </li>
            {getPageItems(current, result.totalPages).map((item, index) => {
              if (item === "ellipsis") {
                return (
                  <li key={`ellipsis-${index}`} aria-hidden="true">
                    <span className="px-1 text-muted">…</span>
                  </li>
                );
              }
              return (
                <li key={item}>
                  {item === current ? (
                    <span aria-current="page" className={CURRENT}>
                      {item}
                    </span>
                  ) : (
                    <Link
                      href={hrefFor(item)}
                      aria-label={`Strona ${item}`}
                      className={LINK}
                    >
                      {item}
                    </Link>
                  )}
                </li>
              );
            })}
            <li>
              <StepLink
                label="Następna"
                href={current < result.totalPages ? hrefFor(current + 1) : null}
              />
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
