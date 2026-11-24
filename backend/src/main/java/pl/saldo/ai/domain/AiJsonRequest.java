package pl.saldo.ai.domain;

import java.util.Map;
import java.util.Objects;

public record AiJsonRequest(String prompt, Map<String, Object> responseSchema) {

	public AiJsonRequest {
		if (prompt == null || prompt.isBlank()) {
			throw new IllegalArgumentException("AI prompt must not be blank");
		}
		Objects.requireNonNull(responseSchema, "responseSchema");
		responseSchema = Map.copyOf(responseSchema);
	}

}
