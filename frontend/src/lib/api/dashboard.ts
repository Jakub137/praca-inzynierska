import { apiRequest } from "@/lib/api/client";
import type { DashboardSummaryResponse } from "@/types/api";

// /dashboard/summary is protected: it needs the Bearer token.
// The backend does all the arithmetic; the client only shows the numbers.
export function getDashboardSummary(
  token: string,
): Promise<DashboardSummaryResponse> {
  return apiRequest<DashboardSummaryResponse>("/dashboard/summary", { token });
}
