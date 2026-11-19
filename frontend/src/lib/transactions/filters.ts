import type { TransactionType } from "@/types/api";

export type TransactionFilters = {
  // One-based, as in the address bar; the API counts pages from zero.
  readonly page: number;
  // "RRRR-MM", or null for all periods.
  readonly month: string | null;
  readonly type: TransactionType | null;
  readonly categoryId: number | null;
};

type RawValue = string | string[] | undefined;

export type RawSearchParams = Readonly<Record<string, RawValue>>;

export const FIRST_PAGE = 1;

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  page: FIRST_PAGE,
  month: null,
  type: null,
  categoryId: null,
};

// Keeps the zero-based page index far inside the backend's Integer range.
const MAX_PAGE_NUMBER = 1_000_000;
// Up to 15 digits: always a safe integer in JavaScript and a valid Long in the backend.
const POSITIVE_INTEGER = /^[1-9]\d{0,14}$/;
const TRANSACTIONS_PATH = "/transactions";

function parsePositiveInteger(value: RawValue): number | null {
  if (typeof value !== "string" || !POSITIVE_INTEGER.test(value)) {
    return null;
  }
  return Number(value);
}

function parsePage(value: RawValue): number {
  const page = parsePositiveInteger(value);
  return page !== null && page <= MAX_PAGE_NUMBER ? page : FIRST_PAGE;
}

function parseMonth(
  value: RawValue,
  validMonths: readonly string[],
): string | null {
  return typeof value === "string" && validMonths.includes(value)
    ? value
    : null;
}

export function parseTransactionType(value: RawValue): TransactionType | null {
  return value === "EXPENSE" || value === "INCOME" ? value : null;
}

export function parseCategoryId(value: RawValue): number | null {
  return parsePositiveInteger(value);
}

// Every invalid value falls back to its default, so a hand-edited address never causes a 400 from the backend.
export function parseTransactionFilters(
  raw: RawSearchParams,
  validMonths: readonly string[],
): TransactionFilters {
  return {
    page: parsePage(raw.page),
    month: parseMonth(raw.month, validMonths),
    type: parseTransactionType(raw.type),
    categoryId: parseCategoryId(raw.categoryId),
  };
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return (
    filters.month !== null ||
    filters.type !== null ||
    filters.categoryId !== null
  );
}

// Default values are left out, so the plain list keeps the address "/transactions".
export function buildTransactionsHref(filters: TransactionFilters): string {
  const query = new URLSearchParams();
  if (filters.month !== null) {
    query.set("month", filters.month);
  }
  if (filters.type !== null) {
    query.set("type", filters.type);
  }
  if (filters.categoryId !== null) {
    query.set("categoryId", String(filters.categoryId));
  }
  if (filters.page > FIRST_PAGE) {
    query.set("page", String(filters.page));
  }
  const queryString = query.toString();
  return queryString === ""
    ? TRANSACTIONS_PATH
    : `${TRANSACTIONS_PATH}?${queryString}`;
}
