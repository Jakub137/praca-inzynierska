package pl.saldo.health.api;

import java.time.Instant;

public record HealthResponse(Status status, Instant timestamp) {

	public enum Status {
		UP
	}
}