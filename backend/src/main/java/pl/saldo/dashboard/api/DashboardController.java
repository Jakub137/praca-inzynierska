package pl.saldo.dashboard.api;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import pl.saldo.dashboard.usecase.GetDashboardSummaryUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Podsumowanie dla strony głównej")
public class DashboardController {

	private final GetDashboardSummaryUseCase getDashboardSummaryUseCase;

	public DashboardController(GetDashboardSummaryUseCase getDashboardSummaryUseCase) {
		this.getDashboardSummaryUseCase = getDashboardSummaryUseCase;
	}

	@GetMapping("/summary")
	@Operation(
			summary = "Podsumowanie finansów na stronę główną",
			description = "Zwraca sumy w PLN dla zalogowanego użytkownika: dostępne środki (przychody minus wydatki "
					+ "z transakcji z datą do dziś włącznie) wraz ze zmianą procentową względem salda na koniec "
					+ "poprzedniego miesiąca, wydatki i przychody całego bieżącego miesiąca oraz sumę limitów "
					+ "budżetowych na ten miesiąc. Bieżący miesiąc i dzień liczone są w strefie Europe/Warsaw. "
					+ "Pola availableFundsChangePercent i monthLimitTotal mają wartość null, gdy nie da się ich "
					+ "wyliczyć (saldo z końca poprzedniego miesiąca nie jest dodatnie albo brak limitów).")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Podsumowanie bieżącego miesiąca",
					content = @Content(schema = @Schema(implementation = DashboardSummaryResponse.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<DashboardSummaryResponse> getSummary(@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(getDashboardSummaryUseCase.execute(principal.id()));
	}

}
