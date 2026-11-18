import { vi } from "vitest";
import type { AuthContextValue } from "@/lib/auth/authContext";
import type { AuthUserResponse } from "@/types/api";

export const TEST_USER: AuthUserResponse = {
  id: "1",
  email: "jakub@example.com",
  firstName: "Jakub",
  lastName: "Janiec",
  defaultCurrency: "PLN",
};

export function makeAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    status: "authenticated",
    user: TEST_USER,
    logout: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}
