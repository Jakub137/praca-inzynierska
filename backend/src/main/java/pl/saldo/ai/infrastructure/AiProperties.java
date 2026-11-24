package pl.saldo.ai.infrastructure;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@ConfigurationProperties("app.ai")
@Validated
public record AiProperties(
		String apiKey,
		@NotBlank String baseUrl,
		@NotBlank String model,
		@NotBlank String thinkingLevel,
		@Positive int maxOutputTokens,
		@NotNull Duration timeout) {

	public boolean hasApiKey() {
		return apiKey != null && !apiKey.isBlank();
	}

	@AssertTrue(message = "app.ai.timeout must be positive")
	public boolean isTimeoutPositive() {
		return timeout == null || (!timeout.isZero() && !timeout.isNegative());
	}

	@Override
	public String toString() {
		return "AiProperties[apiKey=***, baseUrl=" + baseUrl + ", model=" + model
				+ ", thinkingLevel=" + thinkingLevel + ", maxOutputTokens=" + maxOutputTokens
				+ ", timeout=" + timeout + "]";
	}

}
