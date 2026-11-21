package pl.saldo.goal.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.goal.domain.GoalStatus;
import pl.saldo.goal.domain.InvalidSavingsGoalException;
import pl.saldo.goal.usecase.CreateSavingsGoalUseCase;
import pl.saldo.goal.usecase.DeleteSavingsGoalUseCase;
import pl.saldo.goal.usecase.DepositToGoalCommand;
import pl.saldo.goal.usecase.DepositToGoalUseCase;
import pl.saldo.goal.usecase.GetSavingsGoalsUseCase;
import pl.saldo.goal.usecase.SavingsGoalCommand;
import pl.saldo.goal.usecase.UpdateSavingsGoalUseCase;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(SavingsGoalController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class SavingsGoalControllerTest {

	private static final String GOALS_URI = "/api/v1/savings-goals";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate TARGET_DATE = LocalDate.of(2027, 7, 15);
	private static final String VALID_BODY = """
			{"name": "Wakacje we Włoszech", "targetAmount": 6000.00, "targetDate": "2027-07-15"}""";
	private static final SavingsGoalCommand VALID_COMMAND =
			new SavingsGoalCommand("Wakacje we Włoszech", new BigDecimal("6000.00"), TARGET_DATE);
	private static final String DEPOSIT_BODY = """
			{"amount": 500.00}""";
	private static final DepositToGoalCommand DEPOSIT_COMMAND = new DepositToGoalCommand(new BigDecimal("500.00"));
	private static final SavingsGoalResponse RESPONSE = new SavingsGoalResponse(
			3L, "Wakacje we Włoszech", new BigDecimal("6000.00"), new BigDecimal("0.00"), TARGET_DATE,
			GoalStatus.ACTIVE, 7, new BigDecimal("857.15"));

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetSavingsGoalsUseCase getSavingsGoalsUseCase;

	@MockitoBean
	private CreateSavingsGoalUseCase createSavingsGoalUseCase;

	@MockitoBean
	private UpdateSavingsGoalUseCase updateSavingsGoalUseCase;

	@MockitoBean
	private DeleteSavingsGoalUseCase deleteSavingsGoalUseCase;

	@MockitoBean
	private DepositToGoalUseCase depositToGoalUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithGoalsAndComputedFields() {
		authenticate();
		given(getSavingsGoalsUseCase.execute(USER_ID)).willReturn(List.of(RESPONSE));

		MvcTestResult result = mvc.get().uri(GOALS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$[0].id").isEqualTo(3);
		assertThat(result).bodyJson().extractingPath("$[0].name").isEqualTo("Wakacje we Włoszech");
		assertThat(result).bodyJson().extractingPath("$[0].targetAmount").isEqualTo(6000.0);
		assertThat(result).bodyJson().extractingPath("$[0].currentAmount").isEqualTo(0.0);
		assertThat(result).bodyJson().extractingPath("$[0].targetDate").isEqualTo("2027-07-15");
		assertThat(result).bodyJson().extractingPath("$[0].status").isEqualTo("ACTIVE");
		assertThat(result).bodyJson().extractingPath("$[0].monthsRemaining").isEqualTo(7);
		assertThat(result).bodyJson().extractingPath("$[0].monthlyContribution").isEqualTo(857.15);
		assertThat(result).bodyJson().doesNotHavePath("$[0].userId");
	}

	@Test
	void shouldReturn200WithEmptyArrayWhenUserHasNoGoals() {
		authenticate();
		given(getSavingsGoalsUseCase.execute(USER_ID)).willReturn(List.of());

		MvcTestResult result = mvc.get().uri(GOALS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyText().isEqualTo("[]");
	}

	@Test
	void shouldReturn401ForListWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(GOALS_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getSavingsGoalsUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn201WithGoalAndNoLocationHeaderWhenCreated() {
		authenticate();
		given(createSavingsGoalUseCase.execute(USER_ID, VALID_COMMAND)).willReturn(RESPONSE);

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result.getResponse().getHeader(HttpHeaders.LOCATION)).isNull();
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(3);
		assertThat(result).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
	}

	@Test
	void shouldReturn401ForCreateWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(GOALS_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(createSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenNameIsBlank() {
		authenticate();

		MvcTestResult result = create("""
				{"name": " ", "targetAmount": 6000.00, "targetDate": "2027-07-15"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("name");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Nazwa celu jest wymagana");
		then(createSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenTargetAmountIsZero() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Cel", "targetAmount": 0, "targetDate": "2027-07-15"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("targetAmount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota docelowa musi być większa od zera");
		then(createSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenTargetDateIsMissing() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Cel", "targetAmount": 100.00}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("targetDate");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Termin celu jest wymagany");
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenUseCaseRejectsTargetDate() {
		authenticate();
		given(createSavingsGoalUseCase.execute(USER_ID, VALID_COMMAND)).willThrow(new InvalidSavingsGoalException(
				List.of(new ApiFieldError("targetDate", "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza."))));

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("targetDate");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn400WhenDateHasWrongFormat() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Cel", "targetAmount": 100.00, "targetDate": "15.07.2027"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(createSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithGoalWhenUpdated() {
		authenticate();
		given(updateSavingsGoalUseCase.execute(USER_ID, 3L, VALID_COMMAND)).willReturn(RESPONSE);

		MvcTestResult result = update("3", VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(3);
	}

	@Test
	void shouldReturn404WhenUpdatedGoalIsMissingOrForeign() {
		authenticate();
		given(updateSavingsGoalUseCase.execute(USER_ID, 3L, VALID_COMMAND))
				.willThrow(new ResourceNotFoundException("Savings goal not found: 3"));

		MvcTestResult result = update("3", VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
	}

	@Test
	void shouldReturn400WhenUpdatedIdIsNotANumber() {
		authenticate();

		MvcTestResult result = update("abc", VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(updateSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn204WhenDeleted() {
		authenticate();

		MvcTestResult result = delete("3");

		assertThat(result).hasStatus(HttpStatus.NO_CONTENT);
		then(deleteSavingsGoalUseCase).should().execute(USER_ID, 3L);
	}

	@Test
	void shouldReturn404WhenDeletedGoalIsMissingOrForeign() {
		authenticate();
		willThrow(new ResourceNotFoundException("Savings goal not found: 3"))
				.given(deleteSavingsGoalUseCase).execute(USER_ID, 3L);

		MvcTestResult result = delete("3");

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void shouldReturn401ForDeleteWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.delete().uri(GOALS_URI + "/3").exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(deleteSavingsGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithGoalAfterDeposit() {
		authenticate();
		given(depositToGoalUseCase.execute(USER_ID, 3L, DEPOSIT_COMMAND)).willReturn(new SavingsGoalResponse(
				3L, "Wakacje we Włoszech", new BigDecimal("6000.00"), new BigDecimal("6000.00"), TARGET_DATE,
				GoalStatus.COMPLETED, 7, new BigDecimal("0.00")));

		MvcTestResult result = deposit("3", DEPOSIT_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(3);
		assertThat(result).bodyJson().extractingPath("$.currentAmount").isEqualTo(6000.0);
		assertThat(result).bodyJson().extractingPath("$.status").isEqualTo("COMPLETED");
		assertThat(result).bodyJson().extractingPath("$.monthlyContribution").isEqualTo(0.0);
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldReturn401ForDepositWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(GOALS_URI + "/3/deposit")
				.contentType(MediaType.APPLICATION_JSON)
				.content(DEPOSIT_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(depositToGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDepositAmountIsMissing() {
		authenticate();

		MvcTestResult result = deposit("3", "{}");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Kwota wpłaty jest wymagana");
		then(depositToGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDepositAmountIsZero() {
		authenticate();

		MvcTestResult result = deposit("3", """
				{"amount": 0}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota wpłaty musi być większa od zera");
		then(depositToGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDepositAmountHasThreeDecimals() {
		authenticate();

		MvcTestResult result = deposit("3", """
				{"amount": 10.123}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota wpłaty może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
		then(depositToGoalUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenTotalExceedsLimit() {
		authenticate();
		given(depositToGoalUseCase.execute(USER_ID, 3L, DEPOSIT_COMMAND)).willThrow(new InvalidSavingsGoalException(
				List.of(new ApiFieldError("amount",
						"Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę."))));

		MvcTestResult result = deposit("3", DEPOSIT_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę.");
	}

	@Test
	void shouldReturn404WhenDepositGoalIsMissingOrForeign() {
		authenticate();
		given(depositToGoalUseCase.execute(USER_ID, 3L, DEPOSIT_COMMAND))
				.willThrow(new ResourceNotFoundException("Savings goal not found: 3"));

		MvcTestResult result = deposit("3", DEPOSIT_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
	}

	@Test
	void shouldReturn400WhenDepositIdIsNotANumber() {
		authenticate();

		MvcTestResult result = deposit("abc", DEPOSIT_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(depositToGoalUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult create(String body) {
		return mvc.post().uri(GOALS_URI)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult update(String id, String body) {
		return mvc.put().uri(GOALS_URI + "/" + id)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult delete(String id) {
		return mvc.delete().uri(GOALS_URI + "/" + id).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();
	}

	private MvcTestResult deposit(String id, String body) {
		return mvc.post().uri(GOALS_URI + "/" + id + "/deposit")
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
