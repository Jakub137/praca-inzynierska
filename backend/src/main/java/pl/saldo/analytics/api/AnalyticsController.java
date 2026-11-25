package pl.saldo.analytics.api;

import java.util.List;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
import pl.saldo.analytics.usecase.GetMonthlyBalanceQuery;
import pl.saldo.analytics.usecase.GetMonthlyBalanceUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics", description = "Dane do wykresów i analiz")
public class AnalyticsController {

	private final GetMonthlyBalanceUseCase getMonthlyBalanceUseCase;

	public AnalyticsController(GetMonthlyBalanceUseCase getMonthlyBalanceUseCase) {
		this.getMonthlyBalanceUseCase = getMonthlyBalanceUseCase;
	}

	@GetMapping("/monthly-balance")
	@Operation(
			summary = "Miesięczne przychody i wydatki",
			description = "Zwraca dla zalogowanego użytkownika sumy przychodów i wydatków w PLN z ostatnich miesięcy, "
					+ "włącznie z bieżącym (strefa Europe/Warsaw). Każdy miesiąc to cały miesiąc kalendarzowy, także "
					+ "transakcje z datą po dzisiejszej. Pozycje są ułożone od najstarszego miesiąca; miesiąc bez "
					+ "transakcji ma wartości 0.00.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Tyle pozycji, ile miesięcy obejmuje zapytanie",
					content = @Content(
							array = @ArraySchema(schema = @Schema(implementation = MonthlyBalanceResponse.class)))),
			@ApiResponse(
					responseCode = "400",
					description = "Parametr months jest spoza zakresu 1–12 albo nie jest liczbą całkowitą (fieldErrors)",
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
	public ResponseEntity<List<MonthlyBalanceResponse>> getMonthlyBalance(
			@AuthenticationPrincipal UserPrincipal principal,
			@Parameter(
					description = "Liczba miesięcy od 1 do 12 (domyślnie 6)",
					schema = @Schema(type = "integer", minimum = "1", maximum = "12", defaultValue = "6"))
			@RequestParam(required = false) String months) {
		return ResponseEntity.ok(
				getMonthlyBalanceUseCase.execute(principal.id(), new GetMonthlyBalanceQuery(months)));
	}

}
