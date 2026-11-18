package pl.saldo.transaction.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.usecase.CreateTransactionCommand;
import pl.saldo.transaction.usecase.CreateTransactionUseCase;
import pl.saldo.transaction.usecase.DeleteTransactionUseCase;
import pl.saldo.transaction.usecase.GetTransactionUseCase;
import pl.saldo.transaction.usecase.UpdateTransactionCommand;
import pl.saldo.transaction.usecase.UpdateTransactionUseCase;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(TransactionController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class TransactionControllerTest {

	private static final String TRANSACTIONS_URI = "/api/v1/transactions";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID TRANSACTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final String TRANSACTION_URI = TRANSACTIONS_URI + "/" + TRANSACTION_ID;
	private static final LocalDate DATE = LocalDate.of(2026, 11, 14);
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");
	private static final String VALID_BODY = """
			{"amount": 10.50, "currency": "EUR", "categoryId": 5, "date": "2026-11-14",
			"description": "Bilety", "type": "EXPENSE"}""";
	private static final TransactionResponse RESPONSE = new TransactionResponse(
			TRANSACTION_ID, new BigDecimal("10.50"), SupportedCurrency.EUR, new BigDecimal("4.3000"),
			new BigDecimal("45.15"), DATE, "Bilety", TransactionType.EXPENSE, 5L, "Transport", "car", false, NOW);

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private CreateTransactionUseCase createTransactionUseCase;

	@MockitoBean
	private GetTransactionUseCase getTransactionUseCase;

	@MockitoBean
	private UpdateTransactionUseCase updateTransactionUseCase;

	@MockitoBean
	private DeleteTransactionUseCase deleteTransactionUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn201WithLocationAndBodyOnPost() {
		authenticate();
		given(createTransactionUseCase.execute(USER_ID, createCommand())).willReturn(RESPONSE);

		MvcTestResult result = post(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result.getResponse().getHeader(HttpHeaders.LOCATION)).endsWith(TRANSACTION_URI);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(TRANSACTION_ID.toString());
		assertThat(result).bodyJson().extractingPath("$.amountPln").isEqualTo(45.15);
		assertThat(result).bodyJson().extractingPath("$.exchangeRate").isEqualTo(4.3);
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo("Transport");
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
		then(createTransactionUseCase).should().execute(USER_ID, createCommand());
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenAmountIsMissingOnPost() {
		authenticate();

		MvcTestResult result = post("""
				{"currency": "EUR", "categoryId": 5, "date": "2026-11-14", "type": "EXPENSE"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message").isEqualTo("Kwota jest wymagana");
		then(createTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WithGenericMessageWhenCurrencyIsUnknownOnPost() {
		authenticate();

		MvcTestResult result = post("""
				{"amount": 10.50, "currency": "XYZ", "categoryId": 5, "date": "2026-11-14", "type": "EXPENSE"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowe żądanie");
		then(createTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn400WhenCategoryTypeDiffersOnPost() {
		authenticate();
		given(createTransactionUseCase.execute(USER_ID, createCommand())).willThrow(new CategoryTypeMismatchException());

		MvcTestResult result = post(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowa kategoria");
	}

	@Test
	void shouldReturn400WhenAmountPlnExceedsLimitOnPost() {
		authenticate();
		given(createTransactionUseCase.execute(USER_ID, createCommand())).willThrow(new AmountPlnLimitExceededException());

		MvcTestResult result = post(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
	}

	@Test
	void shouldReturn404WhenCategoryIsNotAccessibleOnPost() {
		authenticate();
		given(createTransactionUseCase.execute(USER_ID, createCommand()))
				.willThrow(new ResourceNotFoundException("Category not found: 5"));

		MvcTestResult result = post(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("Żądany zasób nie istnieje.");
	}

	@Test
	void shouldReturn503WithPolishMessageWhenRateIsUnavailableOnPost() {
		authenticate();
		given(createTransactionUseCase.execute(USER_ID, createCommand()))
				.willThrow(new ExchangeRateUnavailableException("NBP down"));

		MvcTestResult result = post(VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.SERVICE_UNAVAILABLE);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Usługa niedostępna");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn401OnPostWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.post().uri(TRANSACTIONS_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(createTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithTransactionOnGet() {
		authenticate();
		given(getTransactionUseCase.execute(USER_ID, TRANSACTION_ID)).willReturn(RESPONSE);

		MvcTestResult result = get(TRANSACTION_URI);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(TRANSACTION_ID.toString());
		assertThat(result).bodyJson().extractingPath("$.description").isEqualTo("Bilety");
	}

	@Test
	void shouldReturn404WhenTransactionIsMissingOrNotOwnedOnGet() {
		authenticate();
		given(getTransactionUseCase.execute(USER_ID, TRANSACTION_ID))
				.willThrow(new ResourceNotFoundException("Transaction not found"));

		MvcTestResult result = get(TRANSACTION_URI);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
	}

	@Test
	void shouldReturn400WhenIdIsNotUuidOnGet() {
		authenticate();

		MvcTestResult result = get(TRANSACTIONS_URI + "/not-a-uuid");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowe żądanie");
		then(getTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn401OnGetWithoutToken() {
		MvcTestResult result = mvc.get().uri(TRANSACTION_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithUpdatedTransactionOnPut() {
		authenticate();
		given(updateTransactionUseCase.execute(USER_ID, TRANSACTION_ID, updateCommand())).willReturn(RESPONSE);

		MvcTestResult result = put(TRANSACTION_URI, VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(TRANSACTION_ID.toString());
		then(updateTransactionUseCase).should().execute(USER_ID, TRANSACTION_ID, updateCommand());
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenAmountIsNotPositiveOnPut() {
		authenticate();

		MvcTestResult result = put(TRANSACTION_URI, """
				{"amount": 0, "currency": "EUR", "categoryId": 5, "date": "2026-11-14", "type": "EXPENSE"}""");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Kwota musi być większa od zera");
		then(updateTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn404WhenTransactionIsMissingOrNotOwnedOnPut() {
		authenticate();
		given(updateTransactionUseCase.execute(USER_ID, TRANSACTION_ID, updateCommand()))
				.willThrow(new ResourceNotFoundException("Transaction not found"));

		MvcTestResult result = put(TRANSACTION_URI, VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void shouldReturn503WhenRateIsUnavailableOnPut() {
		authenticate();
		given(updateTransactionUseCase.execute(USER_ID, TRANSACTION_ID, updateCommand()))
				.willThrow(new ExchangeRateUnavailableException("NBP down"));

		MvcTestResult result = put(TRANSACTION_URI, VALID_BODY);

		assertThat(result).hasStatus(HttpStatus.SERVICE_UNAVAILABLE);
	}

	@Test
	void shouldReturn401OnPutWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.put().uri(TRANSACTION_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(VALID_BODY)
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(updateTransactionUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn204WithoutBodyOnDelete() {
		authenticate();

		MvcTestResult result = delete(TRANSACTION_URI);

		assertThat(result).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(result).body().isEmpty();
		then(deleteTransactionUseCase).should().execute(USER_ID, TRANSACTION_ID);
	}

	@Test
	void shouldReturn404WhenTransactionIsMissingOrNotOwnedOnDelete() {
		authenticate();
		willThrow(new ResourceNotFoundException("Transaction not found"))
				.given(deleteTransactionUseCase).execute(USER_ID, TRANSACTION_ID);

		MvcTestResult result = delete(TRANSACTION_URI);

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void shouldReturn401OnDeleteWithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.delete().uri(TRANSACTION_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(deleteTransactionUseCase).shouldHaveNoInteractions();
	}

	private static CreateTransactionCommand createCommand() {
		return new CreateTransactionCommand(
				new BigDecimal("10.50"), SupportedCurrency.EUR, 5L, DATE, "Bilety", TransactionType.EXPENSE);
	}

	private static UpdateTransactionCommand updateCommand() {
		return new UpdateTransactionCommand(
				new BigDecimal("10.50"), SupportedCurrency.EUR, 5L, DATE, "Bilety", TransactionType.EXPENSE);
	}

	private MvcTestResult post(String body) {
		return mvc.post().uri(TRANSACTIONS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult put(String uri, String body) {
		return mvc.put().uri(uri)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult get(String uri) {
		return mvc.get().uri(uri)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.exchange();
	}

	private MvcTestResult delete(String uri) {
		return mvc.delete().uri(uri)
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
