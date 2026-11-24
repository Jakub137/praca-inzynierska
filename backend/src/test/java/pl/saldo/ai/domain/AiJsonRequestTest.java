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

	@Test
	void shouldTreatBlankSystemInstructionAsAbsent() {
		AiJsonRequest request = new AiJsonRequest("Biedronka", "  ", Map.of());

		assertThat(request.systemInstruction()).isNull();
	}

	@Test
	void shouldKeepSystemInstructionAndLeaveItNullInShortConstructor() {
		AiJsonRequest withInstruction = new AiJsonRequest("Biedronka", "Classify.", Map.of());
		AiJsonRequest withoutInstruction = new AiJsonRequest("Biedronka", Map.of());

		assertThat(withInstruction.systemInstruction()).isEqualTo("Classify.");
		assertThat(withoutInstruction.systemInstruction()).isNull();
	}

}
