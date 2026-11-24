package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import pl.saldo.transaction.domain.TransactionType;

class CategoryKeywordMatcherTest {

	private final CategoryKeywordMatcher matcher = new CategoryKeywordMatcher();

	@Test
	void shouldMatchInflectedStoreName() {
		assertThat(matcher.match("Zakupy w Biedronce", TransactionType.EXPENSE)).contains("Artykuły spożywcze");
	}

	@Test
	void shouldIgnoreCaseAndPolishDiacritics() {
		assertThat(matcher.match("PRĄD za listopad", TransactionType.EXPENSE)).contains("Rachunki");
		assertThat(matcher.match("Żabka", TransactionType.EXPENSE)).contains("Artykuły spożywcze");
		assertThat(matcher.match("Wypłata za listopad", TransactionType.INCOME)).contains("Wynagrodzenie");
	}

	@Test
	void shouldRespectTransactionType() {
		assertThat(matcher.match("Premia kwartalna", TransactionType.EXPENSE)).isEmpty();
		assertThat(matcher.match("Premia kwartalna", TransactionType.INCOME)).contains("Premia");
	}

	@Test
	void shouldMatchOnlyTheBeginningOfAWord() {
		assertThat(matcher.match("Superbolt", TransactionType.EXPENSE)).isEmpty();
	}

	@Test
	void shouldUseFirstMatchingRule() {
		assertThat(matcher.match("Obiad po kinie", TransactionType.EXPENSE)).contains("Restauracje");
	}

	@Test
	void shouldReturnEmptyWhenNothingMatches() {
		assertThat(matcher.match("Coś zupełnie innego", TransactionType.EXPENSE)).isEmpty();
	}

	@Test
	void shouldReturnEmptyForBlankOrNullDescription() {
		assertThat(matcher.match("   ", TransactionType.EXPENSE)).isEmpty();
		assertThat(matcher.match(null, TransactionType.EXPENSE)).isEmpty();
	}

}
