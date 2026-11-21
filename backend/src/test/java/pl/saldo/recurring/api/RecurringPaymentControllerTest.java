package pl.saldo.recurring.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

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
import pl.saldo.recurring.domain.InvalidRecurringPaymentException;
import pl.saldo.recurring.domain.PaymentFrequency;
import pl.saldo.recurring.domain.RecurringPaymentCategoryNotExpenseException;
import pl.saldo.recurring.usecase.CreateRecurringPaymentUseCase;
import pl.saldo.recurring.usecase.GetRecurringPaymentsUseCase;
import pl.saldo.recurring.usecase.RecurringPaymentCommand;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(RecurringPaymentController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class RecurringPaymentControllerTest {

	private static final String PAYMENTS_URI = "/api/v1/recurring-payments";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate DUE_DATE = LocalDate.of(2027, 1, 15);
	private static final String VALID_BODY = """
			{"name": "Netflix", "amount": 43.00, "currency": "PLN", "frequency": "MONTHLY",
			 "nextDueDate": "2027-01-15", "categoryId": 5}""";
	private static final RecurringPaymentCommand VALID_COMMAND = new RecurringPaymentCommand(
			"Netflix", new BigDecimal("43.00"), SupportedCurrency.PLN, PaymentFrequency.MONTHLY, DUE_DATE, 5L);
	private static final RecurringPaymentResponse RESPONSE = new RecurringPaymentResponse(
			3L, "Netflix", new BigDecimal("43.00"), SupportedCurrency.PLN, PaymentFrequency.MONTHLY, DUE_DATE,
			5L, "Rozrywka");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetRecurringPaymentsUseCase getRecurringPaymentsUseCase;

	@MockitoBean
	private CreateRecurringPaymentUseCase createRecurringPaymentUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithPaymentsAndCategoryName() {
		authenticate();
		given(getRecurringPaymentsUseCase.execute(USER_ID)).willReturn(List.of(RESPONSE));

		MvcTestResult result = mvc.get().uri(PAYMENTS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$[0].id").isEqualTo(3);
		assertThat(result).bodyJson().extractingPath("$[0].name").isEqualTo("Netflix");
		assertThat(result).bodyJson().extractingPath("$[0].amount").isEqualTo(43.0);
		assertThat(result).bodyJson().extractingPath("$[0].currency").isEqualTo("PLN");
		assertThat(result).bodyJson().extractingPath("$[0].frequency").isEqualTo("MONTHLY");
		assertThat(result).bodyJson().extractingPath("$[0].nextDueDate").isEqualTo("2027-01-15");
		assertThat(result).bodyJson().extractingPath("$[0].categoryId").isEqualTo(5);
		assertThat(result).bodyJson().extractingPath("$[0].categoryName").isEqualTo("Rozrywka");
		assertThat(result).bodyJson().doesNotHavePath("$[0].userId");
	}

	@Test
	void shouldReturn200WithEmptyArrayWhenUserHasNoPayments() {
		authenticate();
		given(getRecurringPaymentsUseCase.execute(USER_ID)).willReturn(List.of());

		MvcTestResult result = mvc.get().uri(PAYMENTS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyText().isEqualTo("[]");
	}

	@Test
	void shouldReturn401ForListWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(PAYMENTS_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getRecurringPaymentsUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn201WithPaymentAndNoLocationHeaderWhenCreated() {
		authenticate();
		given(createRecurringPaymentUseCase.execute(USER_ID, VALID_COMMAND)).willReturn(RESPONSE);

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result.getResponse().getHeader(HttpHeaders.LOCATION)).isNull();
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(3);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Rozrywka");
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldReturn401ForCreateWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(PAYMENTS_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenNameIsBlank() {
		authenticate();

		MvcTestResult result = create("""
				{"name": " ", "amount": 43.00, "currency": "PLN", "frequency": "MONTHLY",
				 "nextDueDate": "2027-01-15", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("name");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Nazwa płatności jest wymagana");
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenAmountIsZero() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 0, "currency": "PLN", "frequency": "MONTHLY",
				 "nextDueDate": "2027-01-15", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota musi być większa od zera");
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenCategoryIsMissing() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 43.00, "currency": "PLN", "frequency": "MONTHLY",
				 "nextDueDate": "2027-01-15"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("categoryId");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Kategoria jest wymagana");
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenFrequencyIsUnknown() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 43.00, "currency": "PLN", "frequency": "DAILY",
				 "nextDueDate": "2027-01-15", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenFrequencyHasWrongCase() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 43.00, "currency": "PLN", "frequency": "monthly",
				 "nextDueDate": "2027-01-15", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenCurrencyIsUnsupported() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 43.00, "currency": "JPY", "frequency": "MONTHLY",
				 "nextDueDate": "2027-01-15", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenDateHasWrongFormat() {
		authenticate();

		MvcTestResult result = create("""
				{"name": "Netflix", "amount": 43.00, "currency": "PLN", "frequency": "MONTHLY",
				 "nextDueDate": "15.01.2027", "categoryId": 5}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		then(createRecurringPaymentUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenUseCaseRejectsDueDate() {
		authenticate();
		given(createRecurringPaymentUseCase.execute(USER_ID, VALID_COMMAND)).willThrow(
				new InvalidRecurringPaymentException(List.of(new ApiFieldError("nextDueDate",
						"Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę."))));

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("nextDueDate");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo(
				"Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn400WhenCategoryIsNotExpense() {
		authenticate();
		given(createRecurringPaymentUseCase.execute(USER_ID, VALID_COMMAND))
				.willThrow(new RecurringPaymentCategoryNotExpenseException());

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowa kategoria");
		assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo(
				"Płatność cykliczną można przypisać tylko do kategorii wydatków. Wybierz kategorię wydatków.");
	}

	@Test
	void shouldReturn404WhenCategoryIsMissingOrForeign() {
		authenticate();
		given(createRecurringPaymentUseCase.execute(USER_ID, VALID_COMMAND))
				.willThrow(new ResourceNotFoundException("Category not found: 5"));

		MvcTestResult result = create(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
	}

	private MvcTestResult create(String body) {
		return mvc.post().uri(PAYMENTS_URI)
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
