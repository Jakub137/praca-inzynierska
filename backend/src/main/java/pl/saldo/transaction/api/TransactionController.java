package pl.saldo.transaction.api;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.shared.api.PageResponse;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.usecase.CreateTransactionCommand;
import pl.saldo.transaction.usecase.CreateTransactionUseCase;
import pl.saldo.transaction.usecase.DeleteTransactionUseCase;
import pl.saldo.transaction.usecase.GetTransactionUseCase;
import pl.saldo.transaction.usecase.GetTransactionsQuery;
import pl.saldo.transaction.usecase.GetTransactionsUseCase;
import pl.saldo.transaction.usecase.UpdateTransactionCommand;
import pl.saldo.transaction.usecase.UpdateTransactionUseCase;

@RestController
@RequestMapping("/api/v1/transactions")
@Tag(name = "Transactions", description = "Transakcje zalogowanego użytkownika")
public class TransactionController {

	private final CreateTransactionUseCase createTransactionUseCase;
	private final GetTransactionUseCase getTransactionUseCase;
	private final GetTransactionsUseCase getTransactionsUseCase;
	private final UpdateTransactionUseCase updateTransactionUseCase;
	private final DeleteTransactionUseCase deleteTransactionUseCase;

	public TransactionController(
			CreateTransactionUseCase createTransactionUseCase,
			GetTransactionUseCase getTransactionUseCase,
			GetTransactionsUseCase getTransactionsUseCase,
			UpdateTransactionUseCase updateTransactionUseCase,
			DeleteTransactionUseCase deleteTransactionUseCase) {
		this.createTransactionUseCase = createTransactionUseCase;
		this.getTransactionUseCase = getTransactionUseCase;
		this.getTransactionsUseCase = getTransactionsUseCase;
		this.updateTransactionUseCase = updateTransactionUseCase;
		this.deleteTransactionUseCase = deleteTransactionUseCase;
	}

	@GetMapping
	@Operation(
			summary = "Lista transakcji",
			description = "Zwraca stronę transakcji zalogowanego użytkownika. Wszystkie filtry są opcjonalne i "
					+ "łączone warunkiem AND; daty dateFrom i dateTo (RRRR-MM-DD) są włącznie. Domyślnie: page=0 "
					+ "(numeracja od zera), size=20, sortBy=date, sortDirection=desc. Przy równych wartościach "
					+ "sortowania wcześniej jest nowsza transakcja.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Strona transakcji (pusta, gdy nic nie pasuje do filtrów)",
					content = @Content(schema = @Schema(implementation = PageResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędne parametry (fieldErrors): page, size, sortBy, sortDirection, zakres dat "
							+ "albo wartość o złym typie (categoryId, type, daty)",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<PageResponse<TransactionResponse>> getTransactions(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(required = false) Integer page,
			@Parameter(description = "Rozmiar strony, od 1 do 100 (domyślnie 20)")
			@RequestParam(required = false) Integer size,
			@Parameter(description = "Pole sortowania: date, amountPln albo createdAt (domyślnie date)")
			@RequestParam(required = false) String sortBy,
			@Parameter(description = "Kierunek sortowania: asc albo desc (domyślnie desc)")
			@RequestParam(required = false) String sortDirection,
			@RequestParam(required = false) Long categoryId,
			@RequestParam(required = false) TransactionType type,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
		GetTransactionsQuery query = GetTransactionsQuery.of(
				page, size, sortBy, sortDirection, categoryId, type, dateFrom, dateTo);
		return ResponseEntity.ok(getTransactionsUseCase.execute(principal.id(), query));
	}

	@GetMapping("/{id}")
	@Operation(
			summary = "Pobranie transakcji",
			description = "Zwraca jedną transakcję zalogowanego użytkownika. Cudza lub nieistniejąca transakcja "
					+ "daje 404.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Transakcja",
					content = @Content(schema = @Schema(implementation = TransactionResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Identyfikator nie jest poprawnym UUID",
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
					description = "Transakcja nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<TransactionResponse> getTransaction(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(getTransactionUseCase.execute(principal.id(), id));
	}

	@PostMapping
	@Operation(
			summary = "Utworzenie transakcji",
			description = "Zapisuje transakcję zalogowanego użytkownika. Dla waluty innej niż PLN kurs NBP jest "
					+ "pobierany dla daty transakcji, a kwota w PLN liczona i zaokrąglana do 2 miejsc. "
					+ "Typ transakcji musi zgadzać się z typem kategorii.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Transakcja została utworzona (nagłówek Location wskazuje na nią)",
					content = @Content(schema = @Schema(implementation = TransactionResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędne pola (fieldErrors), nieznana waluta, typ niezgodny z kategorią "
							+ "albo kwota po przeliczeniu ponad limit",
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
					description = "Kategoria nie istnieje albo jest niedostępna dla użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "503",
					description = "Nie udało się pobrać kursu waluty",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<TransactionResponse> createTransaction(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody CreateTransactionCommand command) {
		TransactionResponse created = createTransactionUseCase.execute(principal.id(), command);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}")
				.buildAndExpand(created.id())
				.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PutMapping("/{id}")
	@Operation(
			summary = "Edycja transakcji",
			description = "Zastępuje wszystkie pola transakcji. Kurs NBP jest pobierany ponownie tylko przy zmianie "
					+ "waluty lub daty; w innym przypadku zostaje zapisany kurs, a kwota w PLN jest liczona od nowej "
					+ "kwoty. Zmiana waluty na PLN daje kurs 1.0000.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Transakcja po zmianie",
					content = @Content(schema = @Schema(implementation = TransactionResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędne pola (fieldErrors), nieznana waluta, typ niezgodny z kategorią, "
							+ "kwota po przeliczeniu ponad limit albo identyfikator nie jest UUID",
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
					description = "Transakcja lub kategoria nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "503",
					description = "Nie udało się pobrać kursu waluty",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<TransactionResponse> updateTransaction(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id, @Valid @RequestBody UpdateTransactionCommand command) {
		return ResponseEntity.ok(updateTransactionUseCase.execute(principal.id(), id, command));
	}

	@DeleteMapping("/{id}")
	@Operation(
			summary = "Usunięcie transakcji",
			description = "Usuwa transakcję zalogowanego użytkownika. Cudza lub nieistniejąca transakcja daje 404.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Transakcja została usunięta"),
			@ApiResponse(
					responseCode = "400",
					description = "Identyfikator nie jest poprawnym UUID",
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
					description = "Transakcja nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<Void> deleteTransaction(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		deleteTransactionUseCase.execute(principal.id(), id);
		return ResponseEntity.noContent().build();
	}

}
