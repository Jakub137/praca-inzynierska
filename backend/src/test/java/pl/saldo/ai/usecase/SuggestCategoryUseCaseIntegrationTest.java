package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.ai.domain.AiClient;
import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SuggestCategoryUseCaseIntegrationTest {

	private static final Instant NOW = Instant.parse("2026-11-24T10:00:00Z");
	private static final Sort ORDER = Sort.by(CategoryEntity::getName, CategoryEntity::getId);

	@MockitoBean
	private AiClient aiClient;

	private final SuggestCategoryUseCase useCase;
	private final CategoryRepository categoryRepository;
	private final UserRepository userRepository;

	@Autowired
	SuggestCategoryUseCaseIntegrationTest(
			SuggestCategoryUseCase useCase, CategoryRepository categoryRepository, UserRepository userRepository) {
		this.useCase = useCase;
		this.categoryRepository = categoryRepository;
		this.userRepository = userRepository;
	}

	@Test
	void shouldMapAiAnswerToSeededSystemCategory() {
		UserEntity user = saveUser("owner@example.com");
		given(aiClient.generateJson(any(AiJsonRequest.class)))
				.willReturn("{\"categoryName\":\"Rozrywka\",\"confidence\":94}");

		Optional<CategorySuggestion> result = useCase.execute(user.getId(), "Bilety do kina", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(
				systemCategoryId(user, "Rozrywka"), "Rozrywka", 94, Source.AI));
	}

	@Test
	void shouldOfferAndMapOwnCategoryButNeverAnotherUsersCategory() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		CategoryEntity own = categoryRepository.saveAndFlush(
				new CategoryEntity(owner.getId(), "Siłownia", null, TransactionType.EXPENSE));
		categoryRepository.saveAndFlush(
				new CategoryEntity(other.getId(), "Cudza kategoria", null, TransactionType.EXPENSE));
		given(aiClient.generateJson(any(AiJsonRequest.class)))
				.willReturn("{\"categoryName\":\"Siłownia\",\"confidence\":85}");

		Optional<CategorySuggestion> result = useCase.execute(owner.getId(), "Karnet na siłownię", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(own.getId(), "Siłownia", 85, Source.AI));
		ArgumentCaptor<AiJsonRequest> captor = ArgumentCaptor.forClass(AiJsonRequest.class);
		verify(aiClient).generateJson(captor.capture());
		assertThat(captor.getValue().prompt()).contains("- Siłownia").doesNotContain("Cudza kategoria");
	}

	@Test
	void shouldFallBackToKeywordsOnSeededCategoriesWhenAiIsUnavailable() {
		UserEntity user = saveUser("owner@example.com");
		given(aiClient.generateJson(any(AiJsonRequest.class))).willThrow(new AiUnavailableException("down"));

		Optional<CategorySuggestion> result = useCase.execute(
				user.getId(), "Zakupy w Biedronce", TransactionType.EXPENSE);

		assertThat(result).contains(new CategorySuggestion(
				systemCategoryId(user, "Artykuły spożywcze"), "Artykuły spożywcze", 60, Source.KEYWORDS));
	}

	@Test
	void shouldPointEveryKeywordRuleToSeededSystemCategoryOfTheSameType() {
		UserEntity user = saveUser("owner@example.com");

		Map<String, TransactionType> seeded = categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER).stream()
				.collect(Collectors.toMap(CategoryEntity::getName, CategoryEntity::getType));

		assertThat(seeded).containsAllEntriesOf(new CategoryKeywordMatcher().targetCategories());
	}

	private Long systemCategoryId(UserEntity user, String name) {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER).stream()
				.filter(category -> name.equals(category.getName()))
				.map(CategoryEntity::getId)
				.findFirst()
				.orElseThrow();
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(
				new UserEntity(email, "hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW));
	}

}
