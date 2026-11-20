package pl.saldo.budget.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.budget.usecase.SetBudgetLimitCommand;
import pl.saldo.budget.usecase.SetBudgetLimitResult;
import pl.saldo.budget.usecase.SetBudgetLimitUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/budget-limits")
@Tag(name = "Budget limits", description = "Miesięczne limity wydatków")
public class BudgetLimitController {

	private final SetBudgetLimitUseCase setBudgetLimitUseCase;

	public BudgetLimitController(SetBudgetLimitUseCase setBudgetLimitUseCase) {
		this.setBudgetLimitUseCase = setBudgetLimitUseCase;
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

}
