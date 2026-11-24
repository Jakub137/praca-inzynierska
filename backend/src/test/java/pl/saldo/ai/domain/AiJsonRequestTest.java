package pl.saldo.ai.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

class AiJsonRequestTest {

	@Test
	void shouldRejectBlankPrompt() {
		assertThatThrownBy(() -> new AiJsonRequest("  ", Map.of()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void shouldRejectMissingSchema() {
		assertThatThrownBy(() -> new AiJsonRequest("Biedronka", null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void shouldCopySchemaDefensively() {
		Map<String, Object> schema = new HashMap<>();
		schema.put("type", "object");
		AiJsonRequest request = new AiJsonRequest("Biedronka", schema);

		schema.put("type", "string");

		assertThat(request.responseSchema()).containsEntry("type", "object");
	}

}
