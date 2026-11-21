package pl.saldo.budget.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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

import pl.saldo.budget.domain.BudgetCategoryNotExpenseException;
import pl.saldo.budget.domain.BudgetLimitConflictException;
import pl.saldo.budget.domain.BudgetStatus;
import pl.saldo.budget.domain.InvalidBudgetUsageQueryException;
import pl.saldo.budget.usecase.GetBudgetUsageQuery;
import pl.saldo.budget.usecase.GetBudgetUsageUseCase;
import pl.saldo.budget.usecase.SetBudgetLimitCommand;
import pl.saldo.budget.usecase.SetBudgetLimitResult;
import pl.saldo.budget.usecase.SetBudgetLimitUseCase;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(BudgetLimitController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class BudgetLimitControllerTest {

	private static final String LIMITS_URI = "/api/v1/budget-limits";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final String VALID_BODY = """
			{"categoryId": 1, "month": 11, "year": 2026, "limitAmount": 1500.00}""";
	private static final SetBudgetLimitCommand VALID_COMMAND =
			new SetBudgetLimitCommand(1L, 11, 2026, new BigDecimal("1500.00"));
	private static final BudgetLimitResponse RESPONSE =
			new BudgetLimitResponse(7L, 1L, 11, 2026, new BigDecimal("1500.00"));
	private static final String USAGE_URI = LIMITS_URI + "/usage";
	private static final BudgetUsageResponse USAGE = new BudgetUsageResponse(
			1L, "Rozrywka", new BigDecimal("1000.00"), new BigDecimal("850.00"), new BigDecimal("85.00"),
			BudgetStatus.WARNING);

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private SetBudgetLimitUseCase setBudgetLimitUseCase;

	@MockitoBean
	private GetBudgetUsageUseCase getBudgetUsageUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn201WithLimitAndNoLocationHeaderWhenCreated() {
		authenticate();
		given(setBudgetLimitUseCase.execute(USER_ID, VALID_COMMAND)).willReturn(new SetBudgetLimitResult(true, RESPONSE));

		MvcTestResult result = setLimit(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result.getResponse().getHeader(HttpHeaders.LOCATION)).isNull();
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(7);
		assertThat(result).bodyJson().extractingPath("$.categoryId").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$.month").isEqualTo(11);
		assertThat(result).bodyJson().extractingPath("$.year").isEqualTo(2026);
		assertThat(result).bodyJson().extractingPath("$.limitAmount").isEqualTo(1500.0);
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldReturn200WhenExistingLimitWasUpdated() {
		authenticate();
		given(setBudgetLimitUseCase.execute(USER_ID, VALID_COMMAND)).willReturn(new SetBudgetLimitResult(false, RESPONSE));

		MvcTestResult result = setLimit(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(7);
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(LIMITS_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(setBudgetLimitUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenAmountIsZero() {
		authenticate();

		MvcTestResult result = setLimit("""
				{"categoryId": 1, "month": 11, "year": 2026, "limitAmount": 0}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("limitAmount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Limit musi być większy od zera");
		then(setBudgetLimitUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenMonthIsOutOfRange() {
		authenticate();

		MvcTestResult result = setLimit("""
				{"categoryId": 1, "month": 13, "year": 2026, "limitAmount": 1500.00}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("month");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Miesiąc musi być liczbą od 1 do 12");
		then(setBudgetLimitUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenYearIsOutOfRange() {
		authenticate();

		MvcTestResult result = setLimit("""
				{"categoryId": 1, "month": 11, "year": 1999, "limitAmount": 1500.00}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("year");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Rok musi być liczbą od 2000 do 2100");
		then(setBudgetLimitUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenCategoryIsMissing() {
		authenticate();

		MvcTestResult result = setLimit("""
				{"month": 11, "year": 2026, "limitAmount": 1500.00}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("categoryId");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Kategoria jest wymagana");
		then(setBudgetLimitUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithPolishMessageWhenCategoryIsNotExpense() {
		authenticate();
		given(setBudgetLimitUseCase.execute(USER_ID, VALID_COMMAND)).willThrow(new BudgetCategoryNotExpenseException());

		MvcTestResult result = setLimit(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowa kategoria");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Limit miesięczny można ustawić tylko dla kategorii wydatków. Wybierz kategorię wydatków.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn404WhenCategoryIsMissingOrForeign() {
		authenticate();
		given(setBudgetLimitUseCase.execute(USER_ID, VALID_COMMAND)).willThrow(new ResourceNotFoundException("Category not found: 1"));

		MvcTestResult result = setLimit(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
	}

	@Test
	void shouldReturn409WithPolishMessageOnBudgetLimitConflict() {
		authenticate();
		given(setBudgetLimitUseCase.execute(USER_ID, VALID_COMMAND))
				.willThrow(new BudgetLimitConflictException(new RuntimeException("duplicate key")));

		MvcTestResult result = setLimit(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.CONFLICT);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Konflikt danych");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Limit dla tej kategorii i miesiąca został właśnie zapisany. Odśwież dane i spróbuj ponownie.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
		assertThat(result).bodyText().doesNotContain("duplicate key");
	}

	@Test
	void shouldReturn200WithUsageItemsForGivenMonth() {
		authenticate();
		given(getBudgetUsageUseCase.execute(USER_ID, new GetBudgetUsageQuery(11, 2026))).willReturn(List.of(USAGE));

		MvcTestResult result = getUsage("?month=11&year=2026");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$[0].categoryId").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$[0].categoryName").isEqualTo("Rozrywka");
		assertThat(result).bodyJson().extractingPath("$[0].limitAmount").isEqualTo(1000.0);
		assertThat(result).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(850.0);
		assertThat(result).bodyJson().extractingPath("$[0].percentage").isEqualTo(85.0);
		assertThat(result).bodyJson().extractingPath("$[0].status").isEqualTo("WARNING");
		assertThat(result).bodyJson().doesNotHavePath("$[0].userId");
	}

	@Test
	void shouldPassEmptyQueryToUseCaseWhenNoParametersAreGiven() {
		authenticate();
		given(getBudgetUsageUseCase.execute(USER_ID, new GetBudgetUsageQuery(null, null))).willReturn(List.of());

		MvcTestResult result = getUsage("");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyText().isEqualTo("[]");
	}

	@Test
	void shouldReturn401ForUsageWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(USAGE_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getBudgetUsageUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenUseCaseRejectsParameters() {
		authenticate();
		given(getBudgetUsageUseCase.execute(USER_ID, new GetBudgetUsageQuery(11, null)))
				.willThrow(new InvalidBudgetUsageQueryException(
						List.of(new ApiFieldError("year", "Rok jest wymagany, gdy podano miesiąc"))));

		MvcTestResult result = getUsage("?month=11");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("year");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Rok jest wymagany, gdy podano miesiąc");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn400WhenMonthIsNotANumber() {
		authenticate();

		MvcTestResult result = getUsage("?month=abc&year=2026");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(getBudgetUsageUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult setLimit(String body) {
		return mvc.post().uri(LIMITS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult getUsage(String query) {
		return mvc.get().uri(USAGE_URI + query)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.exchange();
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
