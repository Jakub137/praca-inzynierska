import { apiRequest } from "@/lib/api/client";
import type { SavingsGoalResponse } from "@/types/api";

// /savings-goals is protected: it needs the Bearer token.
// The backend sorts the list (nearest deadline first, then id) and the view keeps that order.
export function getSavingsGoals(
  token: string,
): Promise<readonly SavingsGoalResponse[]> {
  return apiRequest<readonly SavingsGoalResponse[]>("/savings-goals", {
    token,
  });
}
