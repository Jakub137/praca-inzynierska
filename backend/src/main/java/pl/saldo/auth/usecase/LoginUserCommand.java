package pl.saldo.auth.usecase;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import pl.saldo.shared.security.PasswordPolicy;
import pl.saldo.shared.validation.MaxUtf8Bytes;

public record LoginUserCommand(
		@NotBlank(message = "Adres e-mail jest wymagany")
		@Size(max = 150, message = "Adres e-mail może mieć maksymalnie 150 znaków")
		String email,

		@NotBlank(message = "Hasło jest wymagane")
		@Size(max = PasswordPolicy.MAX_LENGTH, message = "Hasło może mieć maksymalnie 64 znaki")
		@MaxUtf8Bytes(value = PasswordPolicy.BCRYPT_MAX_BYTES, message = PasswordPolicy.TOO_MANY_BYTES_MESSAGE)
		String password) {

	// The default record toString would print the password and the e-mail; the command must never leak into logs.
	@Override
	public String toString() {
		return "LoginUserCommand[email=***, password=***]";
	}

}
