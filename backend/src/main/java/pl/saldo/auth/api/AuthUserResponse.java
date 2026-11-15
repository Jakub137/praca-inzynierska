package pl.saldo.auth.api;

import java.util.UUID;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.api.UserResponse;

public record AuthUserResponse(
		UUID id,
		String email,
		String firstName,
		String lastName,
		SupportedCurrency defaultCurrency) {

	public static AuthUserResponse fromUserResponse(UserResponse user) {
		return new AuthUserResponse(
				user.id(),
				user.email(),
				user.firstName(),
				user.lastName(),
				user.defaultCurrency());
	}

}
