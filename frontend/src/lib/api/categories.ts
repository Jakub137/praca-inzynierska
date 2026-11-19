import { apiRequest } from "@/lib/api/client";
import type { CategoryResponse } from "@/types/api";

// /categories is protected: it needs the Bearer token.
export function getCategories(
  token: string,
): Promise<readonly CategoryResponse[]> {
  return apiRequest<readonly CategoryResponse[]>("/categories", { token });
}
