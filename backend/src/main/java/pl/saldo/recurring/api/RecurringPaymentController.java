package pl.saldo.recurring.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.recurring.usecase.CreateRecurringPaymentUseCase;
import pl.saldo.recurring.usecase.GetRecurringPaymentsUseCase;
import pl.saldo.recurring.usecase.RecurringPaymentCommand;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/recurring-payments")
@Tag(name = "Recurring payments", description = "Płatności cykliczne zalogowanego użytkownika")
public class RecurringPaymentController {

	private final GetRecurringPaymentsUseCase getRecurringPaymentsUseCase;
	private final CreateRecurringPaymentUseCase createRecurringPaymentUseCase;

	public RecurringPaymentController(
			GetRecurringPaymentsUseCase getRecurringPaymentsUseCase,
			CreateRecurringPaymentUseCase createRecurringPaymentUseCase) {
		this.getRecurringPaymentsUseCase = getRecurringPaymentsUseCase;
		this.createRecurringPaymentUseCase = createRecurringPaymentUseCase;
	}

	@GetMapping
	@Operation(
			summary = "Lista płatności cyklicznych",
			description = "Zwraca płatności zalogowanego użytkownika posortowane po terminie następnej płatności "
					+ "(najbliższy pierwszy), przy równych terminach po kolejności utworzenia. Każda pozycja ma nazwę "
					+ "kategorii. Płatność po terminie zostaje na liście z datą z przeszłości.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Lista płatności (pusta, gdy użytkownik nie ma płatności cyklicznych)",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = RecurringPaymentResponse.class)))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<List<RecurringPaymentResponse>> getRecurringPayments(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(getRecurringPaymentsUseCase.execute(principal.id()));
	}

	@PostMapping
	@Operation(
			summary = "Utworzenie płatności cyklicznej",
			description = "Tworzy płatność cykliczną (WEEKLY, MONTHLY albo YEARLY). Termin następnej płatności może "
					+ "przypadać dziś lub później (strefa Europe/Warsaw), najpóźniej 31.12.2100. Kategoria musi być "
					+ "kategorią wydatków, własną lub systemową. Kwota jest w walucie płatności i nie jest przeliczana na PLN.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Płatność została utworzona",
					content = @Content(schema = @Schema(implementation = RecurringPaymentResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędna nazwa, kwota, waluta, częstotliwość, termin, brak pola albo kategoria przychodów "
							+ "(fieldErrors dla pól)",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "404",
					description = "Kategoria nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<RecurringPaymentResponse> createRecurringPayment(
			@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody RecurringPaymentCommand command) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(createRecurringPaymentUseCase.execute(principal.id(), command));
	}

}
