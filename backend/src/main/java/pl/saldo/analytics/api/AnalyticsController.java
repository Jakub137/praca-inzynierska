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
import pl.saldo.analytics.usecase.GetCategoryDistributionQuery;
import pl.saldo.analytics.usecase.GetCategoryDistributionUseCase;
import pl.saldo.analytics.usecase.GetMonthlyBalanceQuery;
import pl.saldo.analytics.usecase.GetMonthlyBalanceUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics", description = "Dane do wykresów i analiz")
public class AnalyticsController {

	private final GetMonthlyBalanceUseCase getMonthlyBalanceUseCase;
	private final GetCategoryDistributionUseCase getCategoryDistributionUseCase;

	public AnalyticsController(GetMonthlyBalanceUseCase getMonthlyBalanceUseCase,
			GetCategoryDistributionUseCase getCategoryDistributionUseCase) {
		this.getMonthlyBalanceUseCase = getMonthlyBalanceUseCase;
		this.getCategoryDistributionUseCase = getCategoryDistributionUseCase;
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

	@GetMapping("/category-distribution")
	@Operation(
			summary = "Rozkład wydatków według kategorii",
			description = "Zwraca dla zalogowanego użytkownika sumy wydatków w PLN według kategorii z okresu od dateFrom "
					+ "do dateTo (obie daty włącznie) oraz udział procentowy każdej kategorii w sumie wydatków z tego "
					+ "okresu. Podaje się obie daty albo żadną; bez dat okresem jest cały bieżący miesiąc kalendarzowy "
					+ "(strefa Europe/Warsaw), także z transakcjami z datą po dzisiejszej. Kategorie są ułożone od "
					+ "największej kwoty. Każdy procent jest zaokrąglany osobno do 2 miejsc, więc suma procentów może "
					+ "nieznacznie różnić się od 100.00 (np. 99.99 lub 100.01). Bez wydatków totalExpenses to 0.00, "
					+ "a lista jest pusta.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Użyty okres, suma wydatków i lista kategorii",
					content = @Content(schema = @Schema(implementation = CategoryDistributionResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Podana tylko jedna data, zły format, data spoza zakresu 1900-01-01 – 2100-12-31 "
							+ "albo dateFrom po dateTo (fieldErrors)",
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
	public ResponseEntity<CategoryDistributionResponse> getCategoryDistribution(
			@AuthenticationPrincipal UserPrincipal principal,
			@Parameter(
					description = "Początek okresu (włącznie), RRRR-MM-DD; wymagany razem z dateTo",
					schema = @Schema(type = "string", format = "date"))
			@RequestParam(required = false) String dateFrom,
			@Parameter(
					description = "Koniec okresu (włącznie), RRRR-MM-DD; wymagany razem z dateFrom",
					schema = @Schema(type = "string", format = "date"))
			@RequestParam(required = false) String dateTo) {
		return ResponseEntity.ok(getCategoryDistributionUseCase.execute(
				principal.id(), new GetCategoryDistributionQuery(dateFrom, dateTo)));
	}

}
