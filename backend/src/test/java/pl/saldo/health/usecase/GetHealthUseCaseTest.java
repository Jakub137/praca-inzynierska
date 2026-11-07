package pl.saldo.health.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import pl.saldo.health.api.HealthResponse;

class GetHealthUseCaseTest {

	private static final Instant FIXED_TIME = Instant.parse("2026-01-01T12:00:00Z");

	private GetHealthUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetHealthUseCase(Clock.fixed(FIXED_TIME, ZoneOffset.UTC));
	}

	@Test
	void shouldReturnStatusUpWithTimeFromClock() {
		HealthResponse response = useCase.execute();

		assertThat(response).isEqualTo(new HealthResponse(HealthResponse.Status.UP, FIXED_TIME));
	}

}