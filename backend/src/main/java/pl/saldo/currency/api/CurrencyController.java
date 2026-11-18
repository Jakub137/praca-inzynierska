package pl.saldo.currency.api;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import pl.saldo.currency.usecase.GetCurrentRatesUseCase;

@RestController
@RequestMapping("/api/v1/currency")
@Tag(name = "Currency", description = "Kursy walut NBP")
public class CurrencyController {

	private final GetCurrentRatesUseCase getCurrentRatesUseCase;

	public CurrencyController(GetCurrentRatesUseCase getCurrentRatesUseCase) {
		this.getCurrentRatesUseCase = getCurrentRatesUseCase;
	}

	@GetMapping("/rates")
	@Operation(
			summary = "Aktualne kursy średnie NBP",
			description = "Zwraca kursy EUR, USD, GBP i CHF względem PLN (4 miejsca po przecinku) w tej kolejności. "
					+ "effectiveDate to data publikacji kursu przez NBP, a source to NBP (dane na żywo) albo FALLBACK "
					+ "(ostatni znany kurs, gdy NBP jest niedostępny).")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Kursy czterech walut",
					content = @Content(schema = @Schema(implementation = CurrencyRatesResponse.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "503",
					description = "Nie udało się pobrać kursu którejkolwiek waluty (NBP niedostępny i brak ostatniego znanego kursu)",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<CurrencyRatesResponse> getRates() {
		return ResponseEntity.ok(getCurrentRatesUseCase.execute());
	}

}
