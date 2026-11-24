package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class CachedCategorySuggestionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID OTHER_USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final String DESCRIPTION = "Biedronka zakupy";
	private static final BigDecimal AMOUNT = new BigDecimal("184.50");
	private static final CategorySuggestion AI_SUGGESTION =
			new CategorySuggestion(5L, "Artykuły spożywcze", 94, Source.AI);
	private static final CategorySuggestion KEYWORD_SUGGESTION =
			new CategorySuggestion(5L, "Artykuły spożywcze", 60, Source.KEYWORDS);

	@Mock
	private SuggestCategoryUseCase suggestCategoryUseCase;

	private CachedCategorySuggestionUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new CachedCategorySuggestionUseCase(suggestCategoryUseCase, new CategorySuggestionCache());
	}

	@Test
	void shouldDelegateWithTrimmedDescriptionAndDefaultExpenseType() {
		given(suggestCategoryUseCase.execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE))
				.willReturn(Optional.of(AI_SUGGESTION));

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, command("  " + DESCRIPTION + "  ", null));

		assertThat(result).contains(AI_SUGGESTION);
	}

	@Test
	void shouldReturnCachedAiSuggestionWithoutAskingAgain() {
		given(suggestCategoryUseCase.execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE))
				.willReturn(Optional.of(AI_SUGGESTION));

		Optional<CategorySuggestion> first = useCase.execute(USER_ID, command(DESCRIPTION, null));
		Optional<CategorySuggestion> second = useCase.execute(USER_ID, command("  BIEDRONKA   zakupy ", null));

		assertThat(first).contains(AI_SUGGESTION);
		assertThat(second).contains(AI_SUGGESTION);
		verify(suggestCategoryUseCase, times(1)).execute(any(UUID.class), anyString(), any(TransactionType.class));
	}

	@Test
	void shouldNotCacheKeywordSuggestion() {
		given(suggestCategoryUseCase.execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE))
				.willReturn(Optional.of(KEYWORD_SUGGESTION));

		Optional<CategorySuggestion> first = useCase.execute(USER_ID, command(DESCRIPTION, null));
		Optional<CategorySuggestion> second = useCase.execute(USER_ID, command(DESCRIPTION, null));

		assertThat(first).contains(KEYWORD_SUGGESTION);
		assertThat(second).contains(KEYWORD_SUGGESTION);
		verify(suggestCategoryUseCase, times(2)).execute(any(UUID.class), anyString(), any(TransactionType.class));
	}

	@Test
	void shouldNotCacheMissingSuggestion() {
		given(suggestCategoryUseCase.execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE))
				.willReturn(Optional.empty());

		Optional<CategorySuggestion> first = useCase.execute(USER_ID, command(DESCRIPTION, null));
		Optional<CategorySuggestion> second = useCase.execute(USER_ID, command(DESCRIPTION, null));

		assertThat(first).isEmpty();
		assertThat(second).isEmpty();
		verify(suggestCategoryUseCase, times(2)).execute(any(UUID.class), anyString(), any(TransactionType.class));
	}

	@Test
	void shouldNotShareCacheBetweenUsers() {
		given(suggestCategoryUseCase.execute(any(UUID.class), anyString(), any(TransactionType.class)))
				.willReturn(Optional.of(AI_SUGGESTION));

		useCase.execute(USER_ID, command(DESCRIPTION, null));
		useCase.execute(OTHER_USER_ID, command(DESCRIPTION, null));

		verify(suggestCategoryUseCase).execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE);
		verify(suggestCategoryUseCase).execute(OTHER_USER_ID, DESCRIPTION, TransactionType.EXPENSE);
	}

	@Test
	void shouldNotShareCacheBetweenTypes() {
		given(suggestCategoryUseCase.execute(any(UUID.class), anyString(), any(TransactionType.class)))
				.willReturn(Optional.of(AI_SUGGESTION));

		useCase.execute(USER_ID, command(DESCRIPTION, null));
		useCase.execute(USER_ID, command(DESCRIPTION, "INCOME"));

		verify(suggestCategoryUseCase).execute(USER_ID, DESCRIPTION, TransactionType.EXPENSE);
		verify(suggestCategoryUseCase).execute(USER_ID, DESCRIPTION, TransactionType.INCOME);
	}

	private static SuggestCategoryCommand command(String description, String type) {
		return new SuggestCategoryCommand(description, AMOUNT, type);
	}

}
