package pl.saldo.ai.infrastructure;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
record GeminiInteractionResponse(String status, List<Step> steps) {

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Step(String type, List<Content> content) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Content(String type, String text) {
	}

}
