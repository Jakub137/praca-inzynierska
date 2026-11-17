import { apiRequest } from "@/lib/api/client";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from "@/types/api";

// No token on purpose: a stale token would make the public endpoint answer 401.
export function registerUser(request: RegisterRequest): Promise<UserResponse> {
  return apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    body: request,
  });
}

// No token here either: /auth/login is public, so a stale token would only cause a 401.
export function loginUser(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: request,
  });
}

// Unlike register and login, /auth/me is protected: it needs the Bearer token.
export function getCurrentUser(token: string): Promise<UserResponse> {
  return apiRequest<UserResponse>("/auth/me", { token });
}
