package pl.saldo.user.api;

import java.time.Instant;
import java.util.UUID;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.domain.UserEntity;

public record UserResponse(
		UUID id,
		String email,
		String firstName,
		String lastName,
		SupportedCurrency defaultCurrency,
		Instant createdAt) {

	public static UserResponse fromEntity(UserEntity user) {
		return new UserResponse(
				user.getId(),
				user.getEmail(),
				user.getFirstName(),
				user.getLastName(),
				user.getDefaultCurrency(),
				user.getCreatedAt());
	}

}
