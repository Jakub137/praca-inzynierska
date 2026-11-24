package pl.saldo.ai.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import pl.saldo.ai.usecase.CachedCategorySuggestionUseCase;
import pl.saldo.ai.usecase.CategorySuggestion;
import pl.saldo.ai.usecase.CategorySuggestion.Source;
import pl.saldo.ai.usecase.SuggestCategoryCommand;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(AiController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class AiControllerTest {

	private static final String SUGGEST_URI = "/api/v1/ai/suggest-category";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-24T10:00:00Z");
	private static final String DESCRIPTION = "Biedronka zakupy na weekend";
	private static final BigDecimal AMOUNT = new BigDecimal("184.50");
	private static final String VALID_BODY = """
			{"description": "Biedronka zakupy na weekend", "amount": 184.50}""";
	private static final CategorySuggestion SUGGESTION =
			new CategorySuggestion(5L, "Artykuły spożywcze", 94, Source.AI);

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private CachedCategorySuggestionUseCase cachedCategorySuggestionUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithSuggestion() {
		authenticate();
		given(cachedCategorySuggestionUseCase.execute(USER_ID, new SuggestCategoryCommand(DESCRIPTION, AMOUNT, null)))
				.willReturn(Optional.of(SUGGESTION));

		MvcTestResult result = suggest(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryId").isEqualTo(5);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Artykuły spożywcze");
		assertThat(result).bodyJson().extractingPath("$.confidence").isEqualTo(94);
		assertThat(result).bodyJson().extractingPath("$.source").isEqualTo("AI");
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldReturn200WithNullFieldsWhenThereIsNoSuggestion() {
		authenticate();
		given(cachedCategorySuggestionUseCase.execute(USER_ID, new SuggestCategoryCommand(DESCRIPTION, AMOUNT, null)))
				.willReturn(Optional.empty());

		MvcTestResult result = suggest(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().hasPath("$.categoryId");
		assertThat(result).bodyJson().hasPath("$.categoryName");
		assertThat(result).bodyJson().hasPath("$.confidence");
		assertThat(result).bodyJson().hasPath("$.source");
		assertThat(result).bodyJson().extractingPath("$.categoryId").isNull();
		assertThat(result).bodyJson().extractingPath("$.categoryName").isNull();
		assertThat(result).bodyJson().extractingPath("$.confidence").isNull();
		assertThat(result).bodyJson().extractingPath("$.source").isNull();
	}

	@Test
	void shouldPassIncomeTypeToUseCase() {
		authenticate();
		given(cachedCategorySuggestionUseCase.execute(
				USER_ID, new SuggestCategoryCommand("Wypłata za listopad", new BigDecimal("5000.00"), "INCOME")))
				.willReturn(Optional.of(new CategorySuggestion(9L, "Wynagrodzenie", 88, Source.AI)));

		MvcTestResult result = suggest("""
				{"description": "Wypłata za listopad", "amount": 5000.00, "type": "INCOME"}""");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Wynagrodzenie");
	}

	@Test
	void shouldPassTrimmedDescriptionToUseCase() {
		authenticate();
		given(cachedCategorySuggestionUseCase.execute(USER_ID, new SuggestCategoryCommand("Biedronka", AMOUNT, null)))
				.willReturn(Optional.of(SUGGESTION));

		MvcTestResult result = suggest("""
				{"description": "  Biedronka  ", "amount": 184.50}""");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Artykuły spożywcze");
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(SUGGEST_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(cachedCategorySuggestionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDescriptionIsBlank() {
		authenticate();

		MvcTestResult result = suggest("""
				{"description": "   ", "amount": 184.50}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("description");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Opis transakcji jest wymagany");
		then(cachedCategorySuggestionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDescriptionIsLongerThanOneHundredCharacters() {
		authenticate();

		MvcTestResult result = suggest("{\"description\": \"" + "a".repeat(101) + "\", \"amount\": 184.50}");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("description");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Opis może mieć maksymalnie 100 znaków");
		then(cachedCategorySuggestionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithFieldErrorWhenTypeIsUnknown() {
		authenticate();

		MvcTestResult result = suggest("""
				{"description": "Biedronka zakupy na weekend", "amount": 184.50, "type": "TRANSFER"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("type");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Typ transakcji musi mieć wartość EXPENSE albo INCOME");
		assertThat(result).bodyJson().hasPath("$.timestamp");
		then(cachedCategorySuggestionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WhenAmountIsMissing() {
		authenticate();
		given(cachedCategorySuggestionUseCase.execute(USER_ID, new SuggestCategoryCommand(DESCRIPTION, null, null)))
				.willReturn(Optional.of(SUGGESTION));

		MvcTestResult result = suggest("""
				{"description": "Biedronka zakupy na weekend"}""");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Artykuły spożywcze");
	}

	@Test
	void shouldReturn400WhenAmountIsZero() {
		authenticate();

		MvcTestResult result = suggest("""
				{"description": "Biedronka zakupy na weekend", "amount": 0}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota musi być większa od zera");
		then(cachedCategorySuggestionUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult suggest(String body) {
		return mvc.post().uri(SUGGEST_URI)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private static String bearer() {
		return "Bearer " + TOKEN;
	}

	private void authenticate() {
		UserEntity entity = new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(entity, "id", USER_ID);
		given(jwtService.extractUserId(TOKEN)).willReturn(USER_ID);
		given(userRepository.findById(USER_ID)).willReturn(Optional.of(entity));
		given(jwtService.isTokenValid(eq(TOKEN), any(UserPrincipal.class))).willReturn(true);
	}

}
