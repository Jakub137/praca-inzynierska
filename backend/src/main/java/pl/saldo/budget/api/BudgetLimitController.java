package pl.saldo.budget.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.budget.usecase.GetBudgetUsageQuery;
import pl.saldo.budget.usecase.GetBudgetUsageUseCase;
import pl.saldo.budget.usecase.SetBudgetLimitCommand;
import pl.saldo.budget.usecase.SetBudgetLimitResult;
import pl.saldo.budget.usecase.SetBudgetLimitUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/budget-limits")
@Tag(name = "Budget limits", description = "Miesięczne limity wydatków")
public class BudgetLimitController {

	private final SetBudgetLimitUseCase setBudgetLimitUseCase;
	private final GetBudgetUsageUseCase getBudgetUsageUseCase;

	public BudgetLimitController(
			SetBudgetLimitUseCase setBudgetLimitUseCase,
			GetBudgetUsageUseCase getBudgetUsageUseCase) {
		this.setBudgetLimitUseCase = setBudgetLimitUseCase;
		this.getBudgetUsageUseCase = getBudgetUsageUseCase;
	}

	@PostMapping
	@Operation(
			summary = "Ustawienie miesięcznego limitu dla kategorii",
			description = "Tworzy limit wydatków dla kategorii w danym miesiącu i roku albo zmienia kwotę istniejącego "
					+ "(jeden limit na kategorię i miesiąc). Limit można ustawić tylko dla kategorii wydatków, "
					+ "własnej lub systemowej.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Limit został utworzony",
					content = @Content(schema = @Schema(implementation = BudgetLimitResponse.class))),
			@ApiResponse(
					responseCode = "200",
					description = "Kwota istniejącego limitu została zmieniona",
					content = @Content(schema = @Schema(implementation = BudgetLimitResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Nieprawidłowa kwota, miesiąc lub rok, brak pola albo kategoria przychodów. "
							+ "Lista błędów pól w polu fieldErrors.",
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
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "409",
					description = "Równoległe żądanie zapisało limit dla tej kategorii i miesiąca; ponów żądanie",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<BudgetLimitResponse> setBudgetLimit(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody SetBudgetLimitCommand command) {
		SetBudgetLimitResult result = setBudgetLimitUseCase.execute(principal.id(), command);
		HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
		return ResponseEntity.status(status).body(result.limit());
	}

	@GetMapping("/usage")
	@Operation(
			summary = "Wykorzystanie miesięcznych limitów",
			description = "Zwraca limity zalogowanego użytkownika w danym miesiącu wraz z wydatkami (suma kwot w PLN) "
					+ "w tej samej kategorii, procentem wykorzystania i statusem: NORMAL (poniżej 80%), WARNING "
					+ "(od 80% do poniżej 100%), EXCEEDED (100% i więcej). Kategoria bez wydatków ma wydatki 0.00. "
					+ "Pozycje są posortowane po nazwie kategorii. Bez parametrów zwracany jest bieżący miesiąc "
					+ "w strefie Europe/Warsaw; month i year podaje się razem.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Lista pozycji (pusta, gdy w tym miesiącu nie ustawiono limitów)",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = BudgetUsageResponse.class)))),
			@ApiResponse(
					responseCode = "400",
					description = "Podano tylko jeden z parametrów, miesiąc spoza 1–12, rok spoza 2000–2100 "
							+ "albo wartość nie jest liczbą (fieldErrors)",
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
	public ResponseEntity<List<BudgetUsageResponse>> getBudgetUsage(
			@AuthenticationPrincipal UserPrincipal principal,
			@Parameter(description = "Miesiąc od 1 do 12; podawany razem z rokiem (domyślnie bieżący miesiąc)")
			@RequestParam(required = false) Integer month,
			@Parameter(description = "Rok od 2000 do 2100; podawany razem z miesiącem (domyślnie bieżący rok)")
			@RequestParam(required = false) Integer year) {
		return ResponseEntity.ok(getBudgetUsageUseCase.execute(principal.id(), new GetBudgetUsageQuery(month, year)));
	}

}
