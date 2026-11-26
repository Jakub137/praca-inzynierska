package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.mockito.BDDMockito.given;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import pl.saldo.ai.infrastructure.AiProperties;
import pl.saldo.ai.infrastructure.GeminiAiClient;
import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.transaction.domain.TransactionType;
import reactor.core.publisher.Mono;
import tools.jackson.databind.json.JsonMapper;

// Joins the real GeminiAiClient with the use case: only the transport is fake (it never answers),
// so the timeout comes from the client itself, not from a mocked exception.
@ExtendWith(MockitoExtension.class)
class SuggestCategoryUseCaseTimeoutTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Sort EXPECTED_ORDER = Sort.by(CategoryEntity::getName, CategoryEntity::getId);
	private static final String BASE_URL = "https://ai.invalid";
	private static final Duration CLIENT_TIMEOUT = Duration.ofMillis(100);
	// A wide margin for a slow CI runner. It also stops the test if the client ever loses its timeout.
	private static final Duration MAX_WAIT = Duration.ofSeconds(2);

	@Mock
	private CategoryRepository categoryRepository;

	private final AtomicInteger sentRequests = new AtomicInteger();
	private final AtomicBoolean requestCancelled = new AtomicBoolean();

	private SuggestCategoryUseCase useCase;

	@BeforeEach
	void setUp() {
		WebClient webClient = WebClient.builder()
				.baseUrl(BASE_URL)
				.exchangeFunction(request -> {
					sentRequests.incrementAndGet();
					return Mono.<ClientResponse>never().doOnCancel(() -> requestCancelled.set(true));
				})
				.build();
		JsonMapper jsonMapper = JsonMapper.builder().build();
		AiProperties properties = new AiProperties(
				"test-api-key-not-real", BASE_URL, "test-model", "minimal", 1024, CLIENT_TIMEOUT);
		useCase = new SuggestCategoryUseCase(
				new GeminiAiClient(webClient, properties, jsonMapper), categoryRepository,
				new CategoryPromptFactory(), new CategoryKeywordMatcher(), jsonMapper);
		given(categoryRepository.findAllByUserIdOrIsDefaultTrue(USER_ID, EXPECTED_ORDER)).willReturn(List.of(
				category(1L, "Artykuły spożywcze"),
				category(2L, "Rozrywka")));
	}

	@Test
	void shouldReturnKeywordSuggestionAndCancelRequestWhenAiTimesOut() {
		Optional<CategorySuggestion> result = suggestWithinMaxWait("Zakupy w Biedronce");

		assertThat(result).contains(new CategorySuggestion(1L, "Artykuły spożywcze", 60, Source.KEYWORDS));
		assertThat(sentRequests).hasValue(1);
		assertThat(requestCancelled).isTrue();
	}

	@Test
	void shouldReturnEmptyAndCancelRequestWhenAiTimesOutAndNoKeywordMatches() {
		Optional<CategorySuggestion> result = suggestWithinMaxWait("xyzzy qwerty");

		assertThat(result).isEmpty();
		assertThat(sentRequests).hasValue(1);
		assertThat(requestCancelled).isTrue();
	}

	// An exception thrown by the use case would fail the test here, so a returned value means a clean fallback.
	private Optional<CategorySuggestion> suggestWithinMaxWait(String description) {
		return assertTimeoutPreemptively(MAX_WAIT,
				() -> useCase.execute(USER_ID, description, TransactionType.EXPENSE));
	}

	private static CategoryEntity category(Long id, String name) {
		CategoryEntity entity = new CategoryEntity(null, name, null, TransactionType.EXPENSE);
		ReflectionTestUtils.setField(entity, "id", id);
		ReflectionTestUtils.setField(entity, "isDefault", true);
		return entity;
	}

}
