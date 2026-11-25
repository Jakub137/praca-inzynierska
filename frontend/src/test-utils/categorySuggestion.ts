import type { CategorySuggestionResponse } from "@/types/api";

export const AI_GROCERIES: CategorySuggestionResponse = {
  categoryId: 1,
  categoryName: "Artykuły spożywcze",
  confidence: 94,
  source: "AI",
};

export const AI_ENTERTAINMENT: CategorySuggestionResponse = {
  categoryId: 2,
  categoryName: "Rozrywka",
  confidence: 88,
  source: "AI",
};

export const KEYWORD_GROCERIES: CategorySuggestionResponse = {
  categoryId: 1,
  categoryName: "Artykuły spożywcze",
  confidence: 60,
  source: "KEYWORDS",
};

export const NO_SUGGESTION: CategorySuggestionResponse = {
  categoryId: null,
  categoryName: null,
  confidence: null,
  source: null,
};
