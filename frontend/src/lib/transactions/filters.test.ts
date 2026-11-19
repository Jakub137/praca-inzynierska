import { describe, expect, it } from "vitest";
import {
  buildTransactionsHref,
  DEFAULT_TRANSACTION_FILTERS,
  hasActiveFilters,
  parseCategoryId,
  parseTransactionFilters,
  parseTransactionType,
} from "@/lib/transactions/filters";

const VALID_MONTHS = ["2026-11", "2026-10", "2026-02"];

function parse(raw: Record<string, string | string[] | undefined>) {
  return parseTransactionFilters(raw, VALID_MONTHS);
}

describe("parseTransactionFilters", () => {
  it("returns the defaults for an address without parameters", () => {
    expect(parse({})).toEqual(DEFAULT_TRANSACTION_FILTERS);
  });

  it("reads valid values", () => {
    expect(
      parse({ page: "3", month: "2026-10", type: "EXPENSE", categoryId: "7" }),
    ).toEqual({ page: 3, month: "2026-10", type: "EXPENSE", categoryId: 7 });
  });

  it.each([
    "abc",
    "0",
    "-1",
    "1.5",
    "1e3",
    " 2",
    "01",
    "1000001",
    "99999999999999999999",
  ])("falls back to page 1 for page=%s", (page) => {
    expect(parse({ page }).page).toBe(1);
  });

  it("accepts the largest allowed page number", () => {
    expect(parse({ page: "1000000" }).page).toBe(1_000_000);
  });

  it.each(["FOO", "expense", ""])("ignores type=%s", (type) => {
    expect(parse({ type }).type).toBeNull();
  });

  it.each(["x", "0", "-3", "2.5", "1000000000000000"])(
    "ignores categoryId=%s",
    (categoryId) => {
      expect(parse({ categoryId }).categoryId).toBeNull();
    },
  );

  it.each(["2026-13", "2026-1", "2026-09", "abc", ""])(
    "ignores month=%s",
    (month) => {
      expect(parse({ month }).month).toBeNull();
    },
  );

  it("treats repeated parameters as invalid", () => {
    expect(
      parse({
        page: ["1", "2"],
        month: ["2026-10", "2026-11"],
        type: ["EXPENSE"],
        categoryId: ["7"],
      }),
    ).toEqual(DEFAULT_TRANSACTION_FILTERS);
  });
});

describe("parseTransactionType and parseCategoryId", () => {
  it("accept only the known values", () => {
    expect(parseTransactionType("INCOME")).toBe("INCOME");
    expect(parseTransactionType("EXPENSE")).toBe("EXPENSE");
    expect(parseTransactionType("")).toBeNull();
    expect(parseCategoryId("12")).toBe(12);
    expect(parseCategoryId("")).toBeNull();
  });
});

describe("hasActiveFilters", () => {
  it("ignores the page number", () => {
    expect(hasActiveFilters(DEFAULT_TRANSACTION_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, page: 4 })).toBe(
      false,
    );
  });

  it.each([
    { month: "2026-10" },
    { type: "INCOME" as const },
    { categoryId: 2 },
  ])("is true when %o is set", (change) => {
    expect(
      hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, ...change }),
    ).toBe(true);
  });
});

describe("buildTransactionsHref", () => {
  it("returns the plain path for the defaults", () => {
    expect(buildTransactionsHref(DEFAULT_TRANSACTION_FILTERS)).toBe(
      "/transactions",
    );
  });

  it("leaves out page 1 and adds the page from 2", () => {
    expect(
      buildTransactionsHref({ ...DEFAULT_TRANSACTION_FILTERS, page: 2 }),
    ).toBe("/transactions?page=2");
  });

  it("writes every set filter in a fixed order", () => {
    expect(
      buildTransactionsHref({
        page: 3,
        month: "2026-10",
        type: "EXPENSE",
        categoryId: 7,
      }),
    ).toBe("/transactions?month=2026-10&type=EXPENSE&categoryId=7&page=3");
  });
});
