package pl.saldo.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordEncoderConfigurationTest {

	private static final String RAW_PASSWORD = "Secret#123";

	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void setUp() {
		passwordEncoder = new PasswordEncoderConfiguration().passwordEncoder();
	}

	@Test
	void shouldProduceDifferentHashesForSamePasswordBecauseOfSalt() {
		String firstHash = passwordEncoder.encode(RAW_PASSWORD);
		String secondHash = passwordEncoder.encode(RAW_PASSWORD);

		assertThat(firstHash).isNotEqualTo(secondHash);
	}

	@Test
	void shouldMatchPlainPasswordAgainstItsHash() {
		String hash = passwordEncoder.encode(RAW_PASSWORD);

		assertThat(passwordEncoder.matches(RAW_PASSWORD, hash)).isTrue();
	}

	@Test
	void shouldNotMatchWrongPasswordAgainstHash() {
		String hash = passwordEncoder.encode(RAW_PASSWORD);

		assertThat(passwordEncoder.matches("Other#123", hash)).isFalse();
	}

	@Test
	void shouldUseBcryptWithStrengthTwelve() {
		String hash = passwordEncoder.encode(RAW_PASSWORD);

		assertThat(hash).startsWith("$2a$" + PasswordEncoderConfiguration.BCRYPT_STRENGTH + "$");
	}

}
