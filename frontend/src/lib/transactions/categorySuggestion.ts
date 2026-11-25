import { parseAmountOrNull } from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  CategorySuggestionResponse,
  SuggestCategoryRequest,
  TransactionType,
} from "@/types/api";

export const SUGGESTION_DEBOUNCE_MS = 500;
export const SUGGESTION_MIN_DESCRIPTION_LENGTH = 3;

export type CategorySuggestion = {
  // The trimmed description and the type the answer was given for.
  readonly description: string;
  readonly type: TransactionType;
  readonly categoryId: number;
  // Percent; null for a keyword match, which gets no badge.
  readonly aiConfidence: number | null;
};

// null while the description is too short; the amount is sent only when the form would accept it.
export function buildSuggestionRequest(
  description: string,
  amountText: string,
  type: TransactionType,
): SuggestCategoryRequest | null {
  const trimmed = description.trim();
  if (trimmed.length < SUGGESTION_MIN_DESCRIPTION_LENGTH) {
    return null;
  }
  const amount = parseAmountOrNull(amountText);
  return amount === null
    ? { description: trimmed, type }
    : { description: trimmed, amount, type };
}

// A cached answer may point at a category deleted in the meantime, so only a category of the asked
// type that is on the loaded list is accepted.
export function toCategorySuggestion(
  response: CategorySuggestionResponse,
  request: SuggestCategoryRequest,
  categories: readonly CategoryResponse[],
): CategorySuggestion | null {
  const category = categories.find(
    (candidate) =>
      candidate.id === response.categoryId && candidate.type === request.type,
  );
  if (category === undefined) {
    return null;
  }
  return {
    description: request.description,
    type: request.type,
    categoryId: category.id,
    aiConfidence: response.source === "AI" ? response.confidence : null,
  };
}

// A suggestion stays valid only while the form still shows what it was made for.
export function getCurrentSuggestion(
  suggestion: CategorySuggestion | null,
  trimmedDescription: string,
  type: TransactionType,
  categoryId: string,
): CategorySuggestion | null {
  if (suggestion === null) {
    return null;
  }
  const matches =
    suggestion.description === trimmedDescription &&
    suggestion.type === type &&
    String(suggestion.categoryId) === categoryId;
  return matches ? suggestion : null;
}
