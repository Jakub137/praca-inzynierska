package pl.saldo.shared.security;

import java.time.Duration;
import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@ConfigurationProperties("app.jwt")
@Validated
public record JwtProperties(@NotBlank String secret, @NotNull Duration expiration) {

	static final int MIN_SECRET_BYTES = 32;

	@AssertTrue(message = "app.jwt.secret must be Base64 and decode to at least 32 bytes")
	public boolean isSecretStrongEnough() {
		if (secret == null || secret.isBlank()) {
			return true;
		}
		try {
			return decodeSecret().length >= MIN_SECRET_BYTES;
		} catch (IllegalArgumentException e) {
			return false;
		}
	}

	public byte[] decodeSecret() {
		return Base64.getDecoder().decode(secret);
	}

	@Override
	public String toString() {
		return "JwtProperties[secret=***, expiration=" + expiration + "]";
	}

}
