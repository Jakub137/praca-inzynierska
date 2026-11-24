package pl.saldo.ai.domain;

import java.util.Map;
import java.util.Objects;

public record AiJsonRequest(String prompt, String systemInstruction, Map<String, Object> responseSchema) {

	public AiJsonRequest {
		if (prompt == null || prompt.isBlank()) {
			throw new IllegalArgumentException("AI prompt must not be blank");
		}
		if (systemInstruction != null && systemInstruction.isBlank()) {
			systemInstruction = null;
		}
		Objects.requireNonNull(responseSchema, "responseSchema");
		responseSchema = Map.copyOf(responseSchema);
	}

	public AiJsonRequest(String prompt, Map<String, Object> responseSchema) {
		this(prompt, null, responseSchema);
	}

}
