package pl.saldo.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

import pl.saldo.transaction.domain.InvalidTransactionQueryException;

class GlobalExceptionHandlerTest {

	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler(Clock.fixed(NOW, ZoneOffset.UTC));

	@Test
	void shouldMapExchangeRateUnavailableTo503WithPolishMessage() {
		ProblemDetail problem = handler.handleExchangeRateUnavailable();

		assertProblem(problem, HttpStatus.SERVICE_UNAVAILABLE, "Usługa niedostępna",
				"Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.");
	}

	@Test
	void shouldMapResourceNotFoundTo404WithPolishMessage() {
		ProblemDetail problem = handler.handleResourceNotFound();

		assertProblem(problem, HttpStatus.NOT_FOUND, "Nie znaleziono zasobu", "Żądany zasób nie istnieje.");
	}

	@Test
	void shouldMapCategoryTypeMismatchTo400WithPolishMessage() {
		ProblemDetail problem = handler.handleCategoryTypeMismatch();

		assertProblem(problem, HttpStatus.BAD_REQUEST, "Nieprawidłowa kategoria",
				"Typ kategorii nie zgadza się z typem transakcji. "
						+ "Wybierz kategorię wydatków dla wydatku albo kategorię przychodów dla przychodu.");
	}

	@Test
	void shouldMapAmountPlnLimitExceededTo400WithPolishMessage() {
		ProblemDetail problem = handler.handleAmountPlnLimitExceeded();

		assertProblem(problem, HttpStatus.BAD_REQUEST, "Błąd walidacji",
				"Kwota po przeliczeniu na PLN przekracza dopuszczalny limit. Wpisz mniejszą kwotę.");
	}

	@Test
	void shouldMapInvalidTransactionQueryTo400WithFieldErrors() {
		List<ApiFieldError> fieldErrors = List.of(new ApiFieldError("size", "Rozmiar strony musi mieścić się w przedziale od 1 do 100"));

		ProblemDetail problem = handler.handleInvalidTransactionQuery(new InvalidTransactionQueryException(fieldErrors));

		assertProblem(problem, HttpStatus.BAD_REQUEST, "Błąd walidacji",
				"Parametry zapytania są nieprawidłowe. Popraw zaznaczone parametry.");
		assertThat(problem.getProperties()).containsEntry("fieldErrors", fieldErrors);
	}

	private static void assertProblem(ProblemDetail problem, HttpStatus status, String title, String detail) {
		assertThat(problem.getStatus()).isEqualTo(status.value());
		assertThat(problem.getTitle()).isEqualTo(title);
		assertThat(problem.getDetail()).isEqualTo(detail);
		assertThat(problem.getProperties()).containsEntry("timestamp", NOW);
	}

}
