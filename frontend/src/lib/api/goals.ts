import { apiRequest } from "@/lib/api/client";
import type {
  DepositToGoalRequest,
  SavingsGoalRequest,
  SavingsGoalResponse,
} from "@/types/api";

// /savings-goals is protected: it needs the Bearer token.
// The backend sorts the list (nearest deadline first, then id) and the view keeps that order.
export function getSavingsGoals(
  token: string,
): Promise<readonly SavingsGoalResponse[]> {
  return apiRequest<readonly SavingsGoalResponse[]>("/savings-goals", {
    token,
  });
}

// POST answers 201 with the created goal (status, months and contribution computed by the backend).
export function createSavingsGoal(
  token: string,
  request: SavingsGoalRequest,
): Promise<SavingsGoalResponse> {
  return apiRequest<SavingsGoalResponse>("/savings-goals", {
    method: "POST",
    body: request,
    token,
  });
}

// POST answers 200 with the goal after the deposit; a deposit on a completed goal is allowed.
export function depositToSavingsGoal(
  token: string,
  goalId: number,
  request: DepositToGoalRequest,
): Promise<SavingsGoalResponse> {
  return apiRequest<SavingsGoalResponse>(`/savings-goals/${goalId}/deposit`, {
    method: "POST",
    body: request,
    token,
  });
}
