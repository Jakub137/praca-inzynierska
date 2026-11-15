package pl.saldo.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import pl.saldo.currency.domain.SupportedCurrency;

class AuthResponseTest {

	private static final String ACCESS_TOKEN = "secret-jwt-value";

	@Test
	void toStringMasksAccessToken() {
		AuthUserResponse user = new AuthUserResponse(
				UUID.fromString("11111111-1111-1111-1111-111111111111"),
				"jan.kowalski@example.com",
				"Jan",
				"Kowalski",
				SupportedCurrency.PLN);

		String text = new AuthResponse(ACCESS_TOKEN, 86400L, user).toString();

		assertThat(text)
				.doesNotContain(ACCESS_TOKEN)
				.contains("accessToken=***")
				.contains("expiresIn=86400");
	}

}
