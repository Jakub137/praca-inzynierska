import { apiRequest } from "@/lib/api/client";
import type { MonthlyBalanceResponse } from "@/types/api";

// Protected endpoint. The backend returns exactly "months" positions, months without
// transactions included, so the client neither fills gaps nor sums amounts.
export function getMonthlyBalance(
  token: string,
  months: number,
): Promise<readonly MonthlyBalanceResponse[]> {
  return apiRequest<readonly MonthlyBalanceResponse[]>(
    `/analytics/monthly-balance?months=${months}`,
    { token },
  );
}
