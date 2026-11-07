package pl.saldo.health.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pl.saldo.health.usecase.GetHealthUseCase;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

	private final GetHealthUseCase getHealthUseCase;

	public HealthController(GetHealthUseCase getHealthUseCase) {
		this.getHealthUseCase = getHealthUseCase;
	}

	@GetMapping
	public ResponseEntity<HealthResponse> getHealth() {
		return ResponseEntity.ok(getHealthUseCase.execute());
	}

}
