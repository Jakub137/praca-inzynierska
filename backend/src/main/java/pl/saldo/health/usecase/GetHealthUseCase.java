package pl.saldo.health.usecase;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;

import pl.saldo.health.api.HealthResponse;

@Service
public class GetHealthUseCase {

	private final Clock clock;

	public GetHealthUseCase(Clock clock) {
		this.clock = clock;
	}

	public HealthResponse execute() {
		return new HealthResponse(HealthResponse.Status.UP, Instant.now(clock));
	}

}