import { useEffect, useRef, useState } from "react";
import { suggestCategory } from "@/lib/api/ai";
import { readSessionToken } from "@/lib/auth/session";
import {
  buildSuggestionRequest,
  type CategorySuggestion,
  getCurrentSuggestion,
  SUGGESTION_DEBOUNCE_MS,
  toCategorySuggestion,
} from "@/lib/transactions/categorySuggestion";
import type {
  CategoryResponse,
  SuggestCategoryRequest,
  TransactionType,
} from "@/types/api";

type UseCategorySuggestionOptions = {
  // False in edit mode: the saved category must not change by itself.
  enabled: boolean;
  description: string;
  // Raw text of the amount field.
  amount: string;
  type: TransactionType;
  // Id of the chosen category as text; "" means none.
  categoryId: string;
  categories: readonly CategoryResponse[];
  // Selects the suggested category in the form; it does not count as a manual choice.
  onSuggested: (categoryId: string) => void;
};

export type CategorySuggestionState = {
  // The suggestion while the form still matches it; null otherwise.
  readonly current: CategorySuggestion | null;
  // Call when the user picks a category by hand: later suggestions leave the choice alone.
  readonly markManualChoice: () => void;
};

// Any failure (network, timeout, 400, 401) means no suggestion: the user picks a category by hand.
async function requestSuggestion(
  token: string,
  request: SuggestCategoryRequest,
  categories: readonly CategoryResponse[],
): Promise<CategorySuggestion | null> {
  try {
    const response = await suggestCategory(token, request);
    return toCategorySuggestion(response, request, categories);
  } catch {
    return null;
  }
}

export function useCategorySuggestion({
  enabled,
  description,
  amount,
  type,
  categoryId,
  categories,
  onSuggested,
}: UseCategorySuggestionOptions): CategorySuggestionState {
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  // Set by the user's own choice; it stays set until the dialog closes.
  const isManualRef = useRef(false);
  // Read when the timer fires, so a new amount or callback neither restarts the delay nor drops an answer.
  const latestRef = useRef({ amount, onSuggested });
  const trimmedDescription = description.trim();

  useEffect(() => {
    latestRef.current = { amount, onSuggested };
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let isCancelled = false;
    const timer = setTimeout(() => {
      const token = readSessionToken();
      const request = buildSuggestionRequest(
        trimmedDescription,
        latestRef.current.amount,
        type,
      );
      if (token === undefined || request === null || isManualRef.current) {
        return;
      }
      void requestSuggestion(token, request, categories).then((next) => {
        if (isCancelled || isManualRef.current) {
          return;
        }
        setSuggestion(next);
        if (next !== null) {
          latestRef.current.onSuggested(String(next.categoryId));
        }
      });
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, trimmedDescription, type, categories]);

  function markManualChoice() {
    isManualRef.current = true;
    setSuggestion(null);
  }

  return {
    current: getCurrentSuggestion(
      suggestion,
      trimmedDescription,
      type,
      categoryId,
    ),
    markManualChoice,
  };
}
