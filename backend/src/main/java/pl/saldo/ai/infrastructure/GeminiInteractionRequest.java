package pl.saldo.ai.infrastructure;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import pl.saldo.ai.domain.AiJsonRequest;

record GeminiInteractionRequest(
		String model,
		String input,
		boolean store,
		@JsonProperty("response_format") ResponseFormat responseFormat,
		@JsonProperty("generation_config") GenerationConfig generationConfig) {

	// Gemini stores interactions by default; one-shot financial prompts must not be kept.
	private static final boolean STORE_INTERACTION = false;
	private static final String TEXT_TYPE = "text";
	private static final String JSON_MIME_TYPE = "application/json";

	static GeminiInteractionRequest from(AiJsonRequest request, AiProperties properties) {
		ResponseFormat responseFormat = new ResponseFormat(TEXT_TYPE, JSON_MIME_TYPE, request.responseSchema());
		GenerationConfig generationConfig = new GenerationConfig(properties.thinkingLevel(), properties.maxOutputTokens());
		return new GeminiInteractionRequest(
				properties.model(), request.prompt(), STORE_INTERACTION, responseFormat, generationConfig);
	}

	record ResponseFormat(String type, @JsonProperty("mime_type") String mimeType, Map<String, Object> schema) {
	}

	// No temperature: the v1 reference does not list it and the Gemini 3 guide advises against values below 1.0.
	record GenerationConfig(
			@JsonProperty("thinking_level") String thinkingLevel,
			@JsonProperty("max_output_tokens") int maxOutputTokens) {
	}

}
