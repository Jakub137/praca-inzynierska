package pl.saldo.ai.api;

import pl.saldo.ai.usecase.CategorySuggestion;

public record CategorySuggestionResponse(
		Long categoryId, String categoryName, Integer confidence, CategorySuggestion.Source source) {

	public static CategorySuggestionResponse fromSuggestion(CategorySuggestion suggestion) {
		return new CategorySuggestionResponse(
				suggestion.categoryId(), suggestion.categoryName(), suggestion.confidence(), suggestion.source());
	}

	public static CategorySuggestionResponse empty() {
		return new CategorySuggestionResponse(null, null, null, null);
	}

}
