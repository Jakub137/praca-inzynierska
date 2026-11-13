package pl.saldo.health.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import pl.saldo.health.usecase.GetHealthUseCase;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Stan aplikacji")
public class HealthController {

	private final GetHealthUseCase getHealthUseCase;

	public HealthController(GetHealthUseCase getHealthUseCase) {
		this.getHealthUseCase = getHealthUseCase;
	}

	@GetMapping
	@Operation(summary = "Sprawdzenie stanu aplikacji", description = "Zwraca status i znacznik czasu UTC.")
	@ApiResponse(responseCode = "200", description = "Aplikacja działa")
	public ResponseEntity<HealthResponse> getHealth() {
		return ResponseEntity.ok(getHealthUseCase.execute());
	}

}
