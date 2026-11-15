package pl.saldo.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Base64;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

class JwtPropertiesTest {

	private static final Duration EXPIRATION = Duration.ofHours(24);

	private static Validator validator;

	@BeforeAll
	static void createValidator() {
		validator = Validation.buildDefaultValidatorFactory().getValidator();
	}

	@Test
	void acceptsBase64SecretOfExactlyMinimumLength() {
		JwtProperties properties = new JwtProperties(encodedSecretOfLength(32), EXPIRATION);

		assertThat(validator.validate(properties)).isEmpty();
	}

	@Test
	void rejectsBase64SecretShorterThanMinimumLength() {
		JwtProperties properties = new JwtProperties(encodedSecretOfLength(31), EXPIRATION);

		assertThat(validator.validate(properties)).hasSize(1);
	}

	@Test
	void rejectsSecretThatIsNotBase64() {
		JwtProperties properties = new JwtProperties("not base64 !!!", EXPIRATION);

		assertThat(validator.validate(properties)).hasSize(1);
	}

	@Test
	void rejectsBlankSecret() {
		JwtProperties properties = new JwtProperties("", EXPIRATION);

		assertThat(validator.validate(properties)).hasSize(1);
	}

	@Test
	void toStringDoesNotExposeSecret() {
		String secret = encodedSecretOfLength(32);

		assertThat(new JwtProperties(secret, EXPIRATION).toString()).doesNotContain(secret);
	}

	private static String encodedSecretOfLength(int bytes) {
		return Base64.getEncoder().encodeToString(new byte[bytes]);
	}

}
