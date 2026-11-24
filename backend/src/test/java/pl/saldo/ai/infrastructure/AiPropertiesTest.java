package pl.saldo.ai.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class AiPropertiesTest {

	private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

	@Test
	void shouldAcceptValidProperties() {
		assertThat(validator.validate(properties("key", Duration.ofMillis(5000)))).isEmpty();
	}

	@Test
	void shouldRejectNonPositiveTimeout() {
		Set<ConstraintViolation<AiProperties>> violations = validator.validate(properties("key", Duration.ZERO));

		assertThat(violations).extracting(violation -> violation.getPropertyPath().toString())
				.containsExactly("timeoutPositive");
	}

	@Test
	void shouldAllowMissingApiKey() {
		AiProperties properties = properties("", Duration.ofMillis(5000));

		assertThat(validator.validate(properties)).isEmpty();
		assertThat(properties.hasApiKey()).isFalse();
	}

	@Test
	void shouldNotExposeApiKeyInToString() {
		AiProperties properties = properties("secret-test-key", Duration.ofMillis(5000));

		assertThat(properties.toString()).doesNotContain("secret-test-key");
	}

	@Test
	void shouldBindFromKebabCaseProperties() {
		Map<String, String> source = Map.of(
				"app.ai.api-key", "bound-key",
				"app.ai.base-url", "https://example.test",
				"app.ai.model", "test-model",
				"app.ai.thinking-level", "minimal",
				"app.ai.max-output-tokens", "1024",
				"app.ai.timeout", "5000ms");

		AiProperties bound = new Binder(new MapConfigurationPropertySource(source))
				.bind("app.ai", AiProperties.class).get();

		assertThat(bound.apiKey()).isEqualTo("bound-key");
		assertThat(bound.thinkingLevel()).isEqualTo("minimal");
		assertThat(bound.timeout()).isEqualTo(Duration.ofMillis(5000));
	}

	private static AiProperties properties(String apiKey, Duration timeout) {
		return new AiProperties(apiKey, "https://example.test", "test-model", "minimal", 1024, timeout);
	}

}
