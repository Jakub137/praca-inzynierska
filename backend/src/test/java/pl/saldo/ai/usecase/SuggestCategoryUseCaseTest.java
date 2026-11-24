package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.ai.domain.AiClient;
import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.transaction.domain.TransactionType;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class SuggestCategoryUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Sort EXPECTED_ORDER = Sort.by(CategoryEntity::getName, CategoryEntity::getId);

	@Mock
	private AiClient aiClient;

	@Mock
	private CategoryRepository categoryRepository;

	private SuggestCategoryUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new SuggestCategoryUseCase(
				aiClient, categoryRepository, new CategoryPromptFactory(), new CategoryKeywordMatcher(),
				JsonMapper.builder().build());
	}

	@Test
	void shouldReturnAiSuggestionMappedToCategoryId() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Rozrywka\",\"confidence\":94}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Bilety do kina", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(2L, "Rozrywka", 94, Source.AI));
	}

	@Test
	void shouldMapUserOwnCategory() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Siłownia\",\"confidence\":80}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Karnet", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(12L, "Siłownia", 80, Source.AI));
	}

	@Test
	void shouldAcceptConfidenceEqualToThreshold() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Transport\",\"confidence\":60}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Przejazd", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(3L, "Transport", 60, Source.AI));
	}

	@Test
	void shouldFallBackToKeywordsWhenConfidenceIsBelowThreshold() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Rozrywka\",\"confidence\":59}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldFallBackToKeywordsWhenAiIsUnavailable() {
		givenCategories();
		given(aiClient.generateJson(any(AiJsonRequest.class))).willThrow(new AiUnavailableException("down"));

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldFallBackWhenAiNamesUnknownCategory() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Kosmos\",\"confidence\":99}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldFallBackWhenAnswerHasMissingFields() {
		givenCategories();
		givenAiAnswer("{}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldFallBackWhenConfidenceIsAboveHundred() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Rozrywka\",\"confidence\":101}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldFallBackWhenAnswerIsNotAnObject() {
		givenCategories();
		givenAiAnswer("[]");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldReturnEmptyWhenAiFailsAndNoKeywordMatches() {
		givenCategories();
		given(aiClient.generateJson(any(AiJsonRequest.class))).willThrow(new AiUnavailableException("down"));

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Coś zupełnie innego", TransactionType.EXPENSE);

		assertThat(result).isEmpty();
	}

	@Test
	void shouldReturnEmptyWithoutCallingAiWhenUserHasNoCategoryOfRequestedType() {
		given(categoryRepository.findAllByUserIdOrIsDefaultTrue(USER_ID, EXPECTED_ORDER))
				.willReturn(List.of(category(1L, null, "Rozrywka", TransactionType.EXPENSE, true)));

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Wypłata", TransactionType.INCOME);

		assertThat(result).isEmpty();
		verifyNoInteractions(aiClient);
	}

	@Test
	void shouldReturnEmptyWithoutAnyCallForBlankDescription() {
		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "   ", TransactionType.EXPENSE);

		assertThat(result).isEmpty();
		verifyNoInteractions(categoryRepository, aiClient);
	}

	@Test
	void shouldOfferOnlyCategoriesOfRequestedTypeToAi() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Wynagrodzenie\",\"confidence\":90}");

		Optional<CategorySuggestion> result = useCase.execute(USER_ID, "Wypłata za listopad", TransactionType.INCOME);

		assertThat(result).contains(new CategorySuggestion(9L, "Wynagrodzenie", 90, Source.AI));
		ArgumentCaptor<AiJsonRequest> captor = ArgumentCaptor.forClass(AiJsonRequest.class);
		verify(aiClient).generateJson(captor.capture());
		assertThat(captor.getValue().prompt()).contains("- Wynagrodzenie").doesNotContain("Rozrywka").doesNotContain("Siłownia");
	}

	@Test
	void shouldNotSendUserIdentityToAi() {
		givenCategories();
		givenAiAnswer("{\"categoryName\":\"Rozrywka\",\"confidence\":94}");

		useCase.execute(USER_ID, "Bilety do kina", TransactionType.EXPENSE);

		ArgumentCaptor<AiJsonRequest> captor = ArgumentCaptor.forClass(AiJsonRequest.class);
		verify(aiClient).generateJson(captor.capture());
		assertThat(captor.getValue().prompt()).doesNotContain(USER_ID.toString());
		assertThat(captor.getValue().systemInstruction()).doesNotContain(USER_ID.toString());
	}

	private void givenCategories() {
		given(categoryRepository.findAllByUserIdOrIsDefaultTrue(USER_ID, EXPECTED_ORDER)).willReturn(List.of(
				category(1L, null, "Artykuły spożywcze", TransactionType.EXPENSE, true),
				category(2L, null, "Rozrywka", TransactionType.EXPENSE, true),
				category(12L, USER_ID, "Siłownia", TransactionType.EXPENSE, false),
				category(3L, null, "Transport", TransactionType.EXPENSE, true),
				category(9L, null, "Wynagrodzenie", TransactionType.INCOME, true)));
	}

	private void givenAiAnswer(String json) {
		given(aiClient.generateJson(any(AiJsonRequest.class))).willReturn(json);
	}

	private static CategoryEntity category(Long id, UUID userId, String name, TransactionType type, boolean isDefault) {
		CategoryEntity entity = new CategoryEntity(userId, name, null, type);
		ReflectionTestUtils.setField(entity, "id", id);
		ReflectionTestUtils.setField(entity, "isDefault", isDefault);
		return entity;
	}

}
