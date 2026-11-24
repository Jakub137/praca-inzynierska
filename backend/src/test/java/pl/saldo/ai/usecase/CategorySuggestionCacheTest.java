package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.transaction.domain.TransactionType;

class CategorySuggestionCacheTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID OTHER_USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final String DESCRIPTION = "Biedronka zakupy na weekend";
	private static final CategorySuggestion SUGGESTION =
			new CategorySuggestion(5L, "Artykuły spożywcze", 94, Source.AI);

	private final AtomicLong nanos = new AtomicLong(1_000L);
	private final CategorySuggestionCache cache = new CategorySuggestionCache(nanos::get);

	@Test
	void shouldReturnStoredSuggestion() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		assertThat(cache.find(USER_ID, TransactionType.EXPENSE, DESCRIPTION)).contains(SUGGESTION);
	}

	@Test
	void shouldTreatCaseAndWhitespaceAsTheSameDescription() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		assertThat(cache.find(USER_ID, TransactionType.EXPENSE, "  BIEDRONKA   Zakupy na\tweekend "))
				.contains(SUGGESTION);
	}

	@Test
	void shouldNotShareEntriesBetweenUsers() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		assertThat(cache.find(OTHER_USER_ID, TransactionType.EXPENSE, DESCRIPTION)).isEmpty();
	}

	@Test
	void shouldNotShareEntriesBetweenTypes() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		assertThat(cache.find(USER_ID, TransactionType.INCOME, DESCRIPTION)).isEmpty();
	}

	@Test
	void shouldReturnEmptyForDifferentDescription() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		assertThat(cache.find(USER_ID, TransactionType.EXPENSE, "Biedronka zakupy")).isEmpty();
	}

	@Test
	void shouldExpireEntryAfterOneHour() {
		cache.store(USER_ID, TransactionType.EXPENSE, DESCRIPTION, SUGGESTION);

		nanos.addAndGet(CategorySuggestionCache.TTL.toNanos() - 1);
		assertThat(cache.find(USER_ID, TransactionType.EXPENSE, DESCRIPTION)).contains(SUGGESTION);

		nanos.addAndGet(2);
		assertThat(cache.find(USER_ID, TransactionType.EXPENSE, DESCRIPTION)).isEmpty();
	}

}
