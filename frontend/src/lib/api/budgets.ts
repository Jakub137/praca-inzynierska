import { apiRequest, apiRequestWithStatus } from "@/lib/api/client";
import type {
  BudgetLimitResponse,
  BudgetUsageResponse,
  SetBudgetLimitRequest,
} from "@/types/api";

const HTTP_CREATED = 201;

export type BudgetUsageParams = {
  readonly year: number;
  // 1-12
  readonly month: number;
};

export type SetBudgetLimitResult = {
  readonly limit: BudgetLimitResponse;
  // True for 201 (a new limit), false for 200 (the amount of an existing limit was changed).
  readonly created: boolean;
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

// POST creates the limit (201) or changes the amount of the existing one for the same category and month (200).
export async function setBudgetLimit(
  token: string,
  request: SetBudgetLimitRequest,
): Promise<SetBudgetLimitResult> {
  const { status, data } = await apiRequestWithStatus<BudgetLimitResponse>(
    "/budget-limits",
    { method: "POST", body: request, token },
  );
  return { limit: data, created: status === HTTP_CREATED };
}
