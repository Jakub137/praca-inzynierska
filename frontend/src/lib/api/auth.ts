import { apiRequest } from "@/lib/api/client";
import type { RegisterRequest, UserResponse } from "@/types/api";

// No token on purpose: a stale token would make the public endpoint answer 401.
export function registerUser(request: RegisterRequest): Promise<UserResponse> {
  return apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    body: request,
  });
}
