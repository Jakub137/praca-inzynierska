import { apiRequest } from "@/lib/api/client";
import type {
  CategorySuggestionResponse,
  SuggestCategoryRequest,
} from "@/types/api";

// /ai/suggest-category is protected: it needs the Bearer token. It answers 200 also when there is
// no suggestion (every field null) and saves nothing.
export function suggestCategory(
  token: string,
  request: SuggestCategoryRequest,
): Promise<CategorySuggestionResponse> {
  return apiRequest<CategorySuggestionResponse>("/ai/suggest-category", {
    method: "POST",
    body: request,
    token,
  });
}
