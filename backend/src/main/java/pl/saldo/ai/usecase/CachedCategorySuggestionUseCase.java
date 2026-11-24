package pl.saldo.ai.usecase;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import pl.saldo.transaction.domain.TransactionType;

// Deliberately not @Transactional: a cache miss ends in an AI call, which must not run inside a database transaction.
@Service
public class CachedCategorySuggestionUseCase {

	private final SuggestCategoryUseCase suggestCategoryUseCase;
	private final CategorySuggestionCache cache;

	public CachedCategorySuggestionUseCase(
			SuggestCategoryUseCase suggestCategoryUseCase, CategorySuggestionCache cache) {
		this.suggestCategoryUseCase = suggestCategoryUseCase;
		this.cache = cache;
	}

	// Only AI answers are cached: they cost tokens. Keyword matches are free, and a missing suggestion may come from
	// a transient AI failure that must not be remembered for the whole cache lifetime.
	public Optional<CategorySuggestion> execute(UUID userId, SuggestCategoryCommand command) {
		TransactionType type = command.transactionType();
		String description = command.description();
		Optional<CategorySuggestion> cached = cache.find(userId, type, description);
		if (cached.isPresent()) {
			return cached;
		}
		Optional<CategorySuggestion> suggestion = suggestCategoryUseCase.execute(userId, description, type);
		suggestion
				.filter(found -> found.source() == CategorySuggestion.Source.AI)
				.ifPresent(found -> cache.store(userId, type, description, found));
		return suggestion;
	}

}
