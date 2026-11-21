package pl.saldo.goal.api;

import java.util.List;

import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.goal.usecase.CreateSavingsGoalUseCase;
import pl.saldo.goal.usecase.DeleteSavingsGoalUseCase;
import pl.saldo.goal.usecase.DepositToGoalCommand;
import pl.saldo.goal.usecase.DepositToGoalUseCase;
import pl.saldo.goal.usecase.GetSavingsGoalsUseCase;
import pl.saldo.goal.usecase.SavingsGoalCommand;
import pl.saldo.goal.usecase.UpdateSavingsGoalUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/savings-goals")
@Tag(name = "Savings goals", description = "Cele oszczędnościowe zalogowanego użytkownika")
public class SavingsGoalController {

	private final GetSavingsGoalsUseCase getSavingsGoalsUseCase;
	private final CreateSavingsGoalUseCase createSavingsGoalUseCase;
	private final UpdateSavingsGoalUseCase updateSavingsGoalUseCase;
	private final DeleteSavingsGoalUseCase deleteSavingsGoalUseCase;
	private final DepositToGoalUseCase depositToGoalUseCase;

	public SavingsGoalController(
			GetSavingsGoalsUseCase getSavingsGoalsUseCase,
			CreateSavingsGoalUseCase createSavingsGoalUseCase,
			UpdateSavingsGoalUseCase updateSavingsGoalUseCase,
			DeleteSavingsGoalUseCase deleteSavingsGoalUseCase,
			DepositToGoalUseCase depositToGoalUseCase) {
		this.getSavingsGoalsUseCase = getSavingsGoalsUseCase;
		this.createSavingsGoalUseCase = createSavingsGoalUseCase;
		this.updateSavingsGoalUseCase = updateSavingsGoalUseCase;
		this.deleteSavingsGoalUseCase = deleteSavingsGoalUseCase;
		this.depositToGoalUseCase = depositToGoalUseCase;
	}

	@GetMapping
	@Operation(
			summary = "Lista celów oszczędnościowych",
			description = "Zwraca cele zalogowanego użytkownika posortowane po terminie (najbliższy pierwszy), przy "
					+ "równych terminach po kolejności utworzenia. Każdy cel ma status (ACTIVE albo COMPLETED, "
					+ "wyliczany z kwot), liczbę pełnych miesięcy do terminu (0, gdy został mniej niż miesiąc "
					+ "albo termin minął) i rekomendowaną miesięczną wpłatę (brakująca kwota podzielona przez "
					+ "miesiące, zaokrąglona w górę do 2 miejsc; 0.00 dla osiągniętego celu; cała brakująca kwota, "
					+ "gdy nie został pełny miesiąc). Miesiące liczone są od dzisiejszej daty w strefie Europe/Warsaw.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Lista celów (pusta, gdy użytkownik nie ma celów)",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = SavingsGoalResponse.class)))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<List<SavingsGoalResponse>> getSavingsGoals(@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(getSavingsGoalsUseCase.execute(principal.id()));
	}

	@PostMapping
	@Operation(
			summary = "Utworzenie celu oszczędnościowego",
			description = "Tworzy cel z zerowym postępem. Termin musi być późniejszy niż dzisiejsza data w strefie "
					+ "Europe/Warsaw i nie późniejszy niż 31.12.2100.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Cel został utworzony",
					content = @Content(schema = @Schema(implementation = SavingsGoalResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędna nazwa, kwota albo termin (fieldErrors)",
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
	public ResponseEntity<SavingsGoalResponse> createSavingsGoal(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody SavingsGoalCommand command) {
		return ResponseEntity.status(HttpStatus.CREATED).body(createSavingsGoalUseCase.execute(principal.id(), command));
	}

	@PutMapping("/{id}")
	@Operation(
			summary = "Edycja celu oszczędnościowego",
			description = "Zastępuje nazwę, kwotę docelową i termin. Zebrana kwota nie zmienia się (wpłaty: osobny "
					+ "endpoint). Termin jest sprawdzany tylko wtedy, gdy się zmienia, więc cel po terminie można "
					+ "przemianować. Obniżenie kwoty docelowej do zebranej kwoty lub poniżej daje status COMPLETED. "
					+ "Cudzy lub nieistniejący cel daje 404.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Cel po zmianie",
					content = @Content(schema = @Schema(implementation = SavingsGoalResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędna nazwa, kwota albo termin (fieldErrors) lub identyfikator nie jest liczbą",
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
					description = "Cel nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<SavingsGoalResponse> updateSavingsGoal(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id, @Valid @RequestBody SavingsGoalCommand command) {
		return ResponseEntity.ok(updateSavingsGoalUseCase.execute(principal.id(), id, command));
	}

	@PostMapping("/{id}/deposit")
	@Operation(
			summary = "Wpłata na cel oszczędnościowy",
			description = "Zwiększa zebraną kwotę celu o podaną kwotę i zwraca cel po wpłacie (kwoty, status, miesiące "
					+ "do terminu i rekomendowaną wpłatę miesięczną). Cel ma status COMPLETED, gdy zebrana kwota jest "
					+ "równa kwocie docelowej lub większa; wpłata na osiągnięty cel jest dozwolona (nadpłata). Suma "
					+ "wpłat na cel nie może przekroczyć 9 999 999 999,99. Cudzy lub nieistniejący cel daje 404.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Cel po wpłacie",
					content = @Content(schema = @Schema(implementation = SavingsGoalResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Błędna kwota albo suma wpłat ponad limit (fieldErrors[amount]) lub identyfikator nie jest liczbą",
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
					description = "Cel nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<SavingsGoalResponse> depositToGoal(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id, @Valid @RequestBody DepositToGoalCommand command) {
		return ResponseEntity.ok(depositToGoalUseCase.execute(principal.id(), id, command));
	}

	@DeleteMapping("/{id}")
	@Operation(
			summary = "Usunięcie celu oszczędnościowego",
			description = "Usuwa cel zalogowanego użytkownika. Cudzy lub nieistniejący cel daje 404.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Cel został usunięty"),
			@ApiResponse(
					responseCode = "400",
					description = "Identyfikator nie jest liczbą",
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
					description = "Cel nie istnieje albo należy do innego użytkownika",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<Void> deleteSavingsGoal(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id) {
		deleteSavingsGoalUseCase.execute(principal.id(), id);
		return ResponseEntity.noContent().build();
	}

}
