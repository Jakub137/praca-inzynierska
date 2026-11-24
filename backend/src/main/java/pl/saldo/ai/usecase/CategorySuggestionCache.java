package pl.saldo.ai.usecase;

import java.time.Duration;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;

import pl.saldo.transaction.domain.TransactionType;

@Component
public class CategorySuggestionCache {

	static final int MAX_ENTRIES = 10_000;
	static final Duration TTL = Duration.ofHours(1);
	private static final Pattern WHITESPACE = Pattern.compile("\\s+");

	private final Cache<Key, CategorySuggestion> cache;

	public CategorySuggestionCache() {
		this(Ticker.systemTicker());
	}

	CategorySuggestionCache(Ticker ticker) {
		this.cache = Caffeine.newBuilder()
				.maximumSize(MAX_ENTRIES)
				.expireAfterWrite(TTL)
				.ticker(ticker)
				.build();
	}

	public Optional<CategorySuggestion> find(UUID userId, TransactionType type, String description) {
		return Optional.ofNullable(cache.getIfPresent(Key.of(userId, type, description)));
	}

	public void store(UUID userId, TransactionType type, String description, CategorySuggestion suggestion) {
		cache.put(Key.of(userId, type, description), suggestion);
	}

	// The key contains the user id: the category list, and so the answer, differs per user.
	private record Key(UUID userId, TransactionType type, String description) {

		static Key of(UUID userId, TransactionType type, String description) {
			String normalized = WHITESPACE.matcher(description.trim()).replaceAll(" ").toLowerCase(Locale.ROOT);
			return new Key(userId, type, normalized);
		}

	}

}
