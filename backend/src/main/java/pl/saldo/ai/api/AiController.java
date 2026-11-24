package pl.saldo.ai.api;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
import pl.saldo.ai.usecase.CachedCategorySuggestionUseCase;
import pl.saldo.ai.usecase.GetDashboardInsightUseCase;
import pl.saldo.ai.usecase.SuggestCategoryCommand;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI", description = "Podpowiedzi i analizy modułu AI")
public class AiController {

	private final CachedCategorySuggestionUseCase cachedCategorySuggestionUseCase;
	private final GetDashboardInsightUseCase getDashboardInsightUseCase;

	public AiController(
			CachedCategorySuggestionUseCase cachedCategorySuggestionUseCase,
			GetDashboardInsightUseCase getDashboardInsightUseCase) {
		this.cachedCategorySuggestionUseCase = cachedCategorySuggestionUseCase;
		this.getDashboardInsightUseCase = getDashboardInsightUseCase;
	}

	@PostMapping("/suggest-category")
	@Operation(
			summary = "Podpowiedź kategorii dla opisu transakcji",
			description = "Zwraca kategorię użytkownika (własną albo systemową) najlepiej pasującą do opisu. Typ "
					+ "transakcji jest opcjonalny (EXPENSE albo INCOME, domyślnie EXPENSE). Kwota jest opcjonalna, sprawdzana "
					+ "tylko gdy jest podana i nie jest wysyłana do dostawcy AI. Gdy AI jest niedostępne albo niepewne, odpowiedź pochodzi ze słów "
					+ "kluczowych (source = KEYWORDS). Gdy nie ma żadnej sugestii, wszystkie pola odpowiedzi są puste "
					+ "(null), a kod to nadal 200. Odpowiedzi AI dla identycznego opisu są pamiętane przez godzinę. "
					+ "Endpoint niczego nie zapisuje: decyzję podejmuje użytkownik.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Sugestia albo odpowiedź z pustymi polami, gdy nie ma sugestii",
					content = @Content(schema = @Schema(implementation = CategorySuggestionResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Pusty lub zbyt długi opis, błędna kwota albo nieznany typ (fieldErrors dla pól)",
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
	public ResponseEntity<CategorySuggestionResponse> suggestCategory(
			@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody SuggestCategoryCommand command) {
		return ResponseEntity.ok(cachedCategorySuggestionUseCase.execute(principal.id(), command)
				.map(CategorySuggestionResponse::fromSuggestion)
				.orElseGet(CategorySuggestionResponse::empty));
	}

	@GetMapping("/dashboard-insight")
	@Operation(
			summary = "Wniosek dla strony głównej: największy wzrost wydatków w kategorii",
			description = "Porównuje wydatki bieżącego miesiąca (strefa Europe/Warsaw, kwoty w PLN) z średnią z trzech "
					+ "poprzednich pełnych miesięcy i zwraca kategorię z największym wzrostem powyżej 30% (przy remisie "
					+ "decyduje większa kwota, potem nazwa kategorii). Brane są tylko kategorie z wydatkami w każdym z "
					+ "trzech poprzednich miesięcy. Wniosek jest liczony regułą, bez modelu językowego i bez wysyłania "
					+ "danych do dostawcy AI. Gdy nie ma anomalii, wszystkie pola odpowiedzi są puste (null), a kod to "
					+ "nadal 200. Endpoint niczego nie zapisuje.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Wniosek albo odpowiedź z pustymi polami, gdy nie wykryto anomalii",
					content = @Content(schema = @Schema(implementation = DashboardInsightResponse.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<DashboardInsightResponse> getDashboardInsight(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(getDashboardInsightUseCase.execute(principal.id())
				.map(DashboardInsightResponse::fromAnomaly)
				.orElseGet(DashboardInsightResponse::empty));
	}

}
