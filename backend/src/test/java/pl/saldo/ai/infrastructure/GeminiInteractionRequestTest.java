package pl.saldo.ai.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.Test;

import pl.saldo.ai.domain.AiJsonRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GeminiInteractionRequestTest {

	private final JsonMapper jsonMapper = JsonMapper.builder().build();

	@Test
	void shouldSerializeInteractionsRequestBody() {
		AiProperties properties = new AiProperties(
				"key", "https://example.test", "gemini-3.1-flash-lite", "minimal", 1024, Duration.ofMillis(5000));
		AiJsonRequest request = new AiJsonRequest("Biedronka zakupy", Map.of("type", "object"));

		JsonNode actual = jsonMapper.readTree(jsonMapper.writeValueAsString(GeminiInteractionRequest.from(request, properties)));

		JsonNode expected = jsonMapper.readTree("""
				{"model":"gemini-3.1-flash-lite","input":"Biedronka zakupy","store":false,
				"response_format":{"type":"text","mime_type":"application/json","schema":{"type":"object"}},
				"generation_config":{"thinking_level":"minimal","max_output_tokens":1024}}
				""");
		assertThat(actual).isEqualTo(expected);
	}

	@Test
	void shouldUseConfiguredModelAndThinkingLevelAndNeverStore() {
		AiProperties properties = new AiProperties(
				"key", "https://example.test", "other-model", "low", 2048, Duration.ofMillis(5000));
		AiJsonRequest request = new AiJsonRequest("Orlen paliwo", Map.of("type", "object"));

		JsonNode actual = jsonMapper.readTree(jsonMapper.writeValueAsString(GeminiInteractionRequest.from(request, properties)));

		assertThat(actual.get("model").asString()).isEqualTo("other-model");
		assertThat(actual.get("store").asBoolean(true)).isFalse();
		assertThat(actual.get("generation_config").get("thinking_level").asString()).isEqualTo("low");
		assertThat(actual.get("generation_config").has("temperature")).isFalse();
	}

	@Test
	void shouldSerializeSystemInstructionWhenPresent() {
		AiProperties properties = new AiProperties(
				"key", "https://example.test", "gemini-3.1-flash-lite", "minimal", 1024, Duration.ofMillis(5000));
		AiJsonRequest request = new AiJsonRequest(
				"Biedronka zakupy", "Classify one transaction.", Map.of("type", "object"));

		JsonNode actual = jsonMapper.readTree(jsonMapper.writeValueAsString(
				GeminiInteractionRequest.from(request, properties)));

		assertThat(actual.get("system_instruction").asString()).isEqualTo("Classify one transaction.");
		assertThat(actual.get("input").asString()).isEqualTo("Biedronka zakupy");
	}

}
