package pl.saldo.ai.usecase;

public record CategorySuggestion(Long categoryId, String categoryName, int confidence, Source source) {

	public enum Source {
		AI,
		KEYWORDS
	}

}
