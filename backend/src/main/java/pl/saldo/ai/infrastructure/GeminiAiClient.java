package pl.saldo.ai.infrastructure;

import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

import pl.saldo.ai.domain.AiClient;
import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

public class GeminiAiClient implements AiClient {

	private static final Logger log = LoggerFactory.getLogger(GeminiAiClient.class);

	// Stable (GA) version of the Interactions API; v1beta had breaking changes in May 2026 (outputs -> steps).
	static final String INTERACTIONS_PATH = "/v1/interactions";
	static final String API_KEY_HEADER = "x-goog-api-key";

	private static final String COMPLETED_STATUS = "completed";
	private static final String MODEL_OUTPUT_STEP = "model_output";
	private static final String TEXT_CONTENT = "text";

	private final WebClient webClient;
	private final AiProperties properties;
	private final JsonMapper jsonMapper;

	public GeminiAiClient(WebClient webClient, AiProperties properties, JsonMapper jsonMapper) {
		this.webClient = webClient;
		this.properties = properties;
		this.jsonMapper = jsonMapper;
	}

	@Override
	public String generateJson(AiJsonRequest request) {
		Objects.requireNonNull(request, "request");
		if (!properties.hasApiKey()) {
			throw failure("AI API key is not configured", null);
		}
		GeminiInteractionResponse response = send(request);
		String text = extractText(response);
		requireValidJson(text);
		return text;
	}

	private GeminiInteractionResponse send(AiJsonRequest request) {
		try {
			return webClient.post()
					.uri(INTERACTIONS_PATH)
					.header(API_KEY_HEADER, properties.apiKey())
					.contentType(MediaType.APPLICATION_JSON)
					.bodyValue(GeminiInteractionRequest.from(request, properties))
					.retrieve()
					.bodyToMono(GeminiInteractionResponse.class)
					.timeout(properties.timeout())
					.block();
		} catch (RuntimeException e) {
			throw failure("Gemini request failed", e);
		}
	}

	private String extractText(GeminiInteractionResponse response) {
		if (response == null || response.steps() == null || !COMPLETED_STATUS.equals(response.status())) {
			throw failure("Gemini did not complete the interaction", null);
		}
		return response.steps().stream()
				.filter(step -> MODEL_OUTPUT_STEP.equals(step.type()) && step.content() != null)
				.flatMap(step -> step.content().stream())
				.filter(content -> TEXT_CONTENT.equals(content.type()))
				.map(GeminiInteractionResponse.Content::text)
				.filter(text -> text != null && !text.isBlank())
				.findFirst()
				.orElseThrow(() -> failure("Gemini returned no text output", null));
	}

	private void requireValidJson(String text) {
		try {
			jsonMapper.readTree(text);
		} catch (JacksonException e) {
			throw failure("Gemini returned text that is not valid JSON", e);
		}
	}

	private AiUnavailableException failure(String message, Throwable cause) {
		// Log only the message and the cause type: never the API key or the provider response body.
		log.warn("{}{}", message, cause == null ? "" : " (" + cause.getClass().getSimpleName() + ")");
		return cause == null ? new AiUnavailableException(message) : new AiUnavailableException(message, cause);
	}

}
