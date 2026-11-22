import { describe, expect, it } from "vitest";
import { selectTopBudgets } from "@/lib/dashboard/topBudgets";
import {
  EXCEEDED_USAGE,
  NORMAL_USAGE,
  WARNING_USAGE,
} from "@/test-utils/budgets";
import type { BudgetUsageResponse } from "@/types/api";

const LOW_USAGE: BudgetUsageResponse = {
  categoryId: 4,
  categoryName: "Zdrowie",
  limitAmount: 400,
  spentAmount: 40,
  percentage: 10,
  status: "NORMAL",
};

function ids(usage: readonly BudgetUsageResponse[]): number[] {
  return usage.map((item) => item.categoryId);
}

describe("selectTopBudgets", () => {
  it("returns the three most used limits, highest percentage first", () => {
    const result = selectTopBudgets([
      LOW_USAGE,
      NORMAL_USAGE,
      EXCEEDED_USAGE,
      WARNING_USAGE,
    ]);

    expect(ids(result)).toEqual([3, 2, 1]);
  });

  it("orders equal percentages by category name", () => {
    const later = {
      ...NORMAL_USAGE,
      categoryId: 5,
      categoryName: "Ubrania",
      percentage: 50,
    };
    const earlier = {
      ...NORMAL_USAGE,
      categoryId: 6,
      categoryName: "Auto",
      percentage: 50,
    };

    expect(ids(selectTopBudgets([later, earlier]))).toEqual([6, 5]);
  });

  it("returns every limit when there are fewer than three", () => {
    expect(ids(selectTopBudgets([LOW_USAGE, EXCEEDED_USAGE]))).toEqual([3, 4]);
  });

  it("does not change the list it was given", () => {
    const input = [LOW_USAGE, EXCEEDED_USAGE];

    selectTopBudgets(input);

    expect(input).toEqual([LOW_USAGE, EXCEEDED_USAGE]);
  });

  it("returns an empty list for no limits", () => {
    expect(selectTopBudgets([])).toEqual([]);
  });
});
