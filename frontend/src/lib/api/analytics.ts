import type { DateRange } from "@/lib/analytics/distributionRange";
import { apiRequest } from "@/lib/api/client";
import type {
  CategoryDistributionResponse,
  MonthlyBalanceResponse,
} from "@/types/api";

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

// Protected endpoint. The backend sums the amounts, counts the shares and orders the categories.
export function getCategoryDistribution(
  token: string,
  range: DateRange,
): Promise<CategoryDistributionResponse> {
  const query = new URLSearchParams({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  });
  return apiRequest<CategoryDistributionResponse>(
    `/analytics/category-distribution?${query.toString()}`,
    { token },
  );
}
