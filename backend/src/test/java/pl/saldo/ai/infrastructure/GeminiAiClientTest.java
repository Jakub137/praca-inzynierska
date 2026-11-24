package pl.saldo.ai.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import reactor.core.publisher.Mono;
import tools.jackson.databind.json.JsonMapper;

class GeminiAiClientTest {

	private static final String API_KEY = "test-api-key-not-real";
	private static final String BASE_URL = "https://generativelanguage.googleapis.com";
	private static final Duration TIMEOUT = Duration.ofMillis(200);
	private static final AiJsonRequest REQUEST = new AiJsonRequest("Biedronka zakupy na weekend", Map.of("type", "object"));

	private static final String SUCCESS_RESPONSE = """
			{"id":"v1_test","object":"interaction","status":"completed","steps":[
			{"type":"model_output","content":[{"type":"text","text":"{\\"categoryName\\":\\"Jedzenie\\",\\"confidence\\":94}"}]}]}
			""";
	private static final String INCOMPLETE_RESPONSE = """
			{"status":"incomplete","steps":[
			{"type":"model_output","content":[{"type":"text","text":"{\\"categoryName\\":"}]}]}
			""";
	private static final String NO_MODEL_OUTPUT_RESPONSE = """
			{"status":"completed","steps":[{"type":"thought","content":[]}]}
			""";
	private static final String NOT_JSON_TEXT_RESPONSE = """
			{"status":"completed","steps":[
			{"type":"model_output","content":[{"type":"text","text":"this is not json"}]}]}
			""";

	private final List<ClientRequest> requests = new ArrayList<>();
	private Supplier<Mono<ClientResponse>> nextResponse;
	private GeminiAiClient client;

	@BeforeEach
	void setUp() {
		client = newClient(API_KEY);
	}

	@Test
	void shouldReturnJsonTextFromModelOutputStep() {
		respondWith(HttpStatus.OK, SUCCESS_RESPONSE);

		String json = client.generateJson(REQUEST);

		assertThat(json).isEqualTo("{\"categoryName\":\"Jedzenie\",\"confidence\":94}");
	}

	@Test
	void shouldPostToInteractionsEndpointWithKeyInHeaderOnly() {
		respondWith(HttpStatus.OK, SUCCESS_RESPONSE);

		client.generateJson(REQUEST);

		ClientRequest sent = requests.getFirst();
		assertThat(sent.method()).isEqualTo(HttpMethod.POST);
		assertThat(sent.url().toString()).isEqualTo(BASE_URL + "/v1/interactions");
		assertThat(sent.url().toString()).doesNotContain(API_KEY);
		assertThat(sent.headers().getFirst("x-goog-api-key")).isEqualTo(API_KEY);
	}

	@Test
	void shouldThrowWithoutCallingApiWhenKeyIsMissing() {
		GeminiAiClient clientWithoutKey = newClient("");

		assertThatThrownBy(() -> clientWithoutKey.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
		assertThat(requests).isEmpty();
	}

	@Test
	void shouldThrowWhenProviderReturnsServerError() {
		respondWith(HttpStatus.INTERNAL_SERVER_ERROR, "{\"error\":\"boom\"}");

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class)
				.hasMessageNotContaining(API_KEY)
				.hasCauseInstanceOf(WebClientResponseException.InternalServerError.class);
	}

	@Test
	void shouldThrowWhenProviderReturnsTooManyRequests() {
		respondWith(HttpStatus.TOO_MANY_REQUESTS, "{\"error\":\"quota\"}");

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class)
				.hasCauseInstanceOf(WebClientResponseException.TooManyRequests.class);
	}

	@Test
	void shouldThrowWhenConnectionFails() {
		nextResponse = () -> Mono.error(new IOException("Connection refused"));

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class)
				.hasRootCauseInstanceOf(IOException.class);
	}

	@Test
	void shouldThrowWhenRequestTimesOut() {
		nextResponse = Mono::never;

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class)
				.hasRootCauseInstanceOf(TimeoutException.class);
	}

	@Test
	void shouldThrowWhenResponseBodyIsEmpty() {
		respondWith(HttpStatus.OK, "");

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
	}

	@Test
	void shouldThrowWhenResponseBodyIsNotJson() {
		respondWith(HttpStatus.OK, "<html>oops</html>");

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
	}

	@Test
	void shouldThrowWhenInteractionIsNotCompleted() {
		respondWith(HttpStatus.OK, INCOMPLETE_RESPONSE);

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
	}

	@Test
	void shouldThrowWhenThereIsNoModelOutputText() {
		respondWith(HttpStatus.OK, NO_MODEL_OUTPUT_RESPONSE);

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
	}

	@Test
	void shouldThrowWhenModelTextIsNotValidJson() {
		respondWith(HttpStatus.OK, NOT_JSON_TEXT_RESPONSE);

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.isInstanceOf(AiUnavailableException.class);
	}

	@Test
	void shouldNotLeakApiKeyInExceptionMessage() {
		respondWith(HttpStatus.INTERNAL_SERVER_ERROR, "error");

		assertThatThrownBy(() -> client.generateJson(REQUEST))
				.satisfies(exception -> {
					assertThat(exception.getMessage()).doesNotContain(API_KEY);
					assertThat(exception.getCause().getMessage()).doesNotContain(API_KEY);
				});
	}

	private GeminiAiClient newClient(String apiKey) {
		AiProperties properties = new AiProperties(
				apiKey, BASE_URL, "gemini-3.1-flash-lite", "minimal", 1024, TIMEOUT);
		WebClient webClient = WebClient.builder()
				.baseUrl(BASE_URL)
				.exchangeFunction(request -> {
					requests.add(request);
					return nextResponse.get();
				})
				.build();
		return new GeminiAiClient(webClient, properties, JsonMapper.builder().build());
	}

	private void respondWith(HttpStatus status, String body) {
		nextResponse = () -> Mono.just(ClientResponse.create(status)
				.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
				.body(body)
				.build());
	}

}
