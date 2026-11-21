import { apiRequest } from "@/lib/api/client";
import type { BudgetUsageResponse } from "@/types/api";

export type BudgetUsageParams = {
  readonly year: number;
  // 1-12
  readonly month: number;
};

// /budget-limits/usage is protected: it needs the Bearer token.
// Without parameters the backend answers for the current month in Europe/Warsaw; month and year go together.
export function getBudgetUsage(
  token: string,
  params?: BudgetUsageParams,
): Promise<readonly BudgetUsageResponse[]> {
  const query =
    params === undefined
      ? ""
      : `?${new URLSearchParams({
          month: String(params.month),
          year: String(params.year),
        }).toString()}`;
  return apiRequest<readonly BudgetUsageResponse[]>(
    `/budget-limits/usage${query}`,
    { token },
  );
}
