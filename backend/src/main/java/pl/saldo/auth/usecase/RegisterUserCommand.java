package pl.saldo.auth.usecase;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import pl.saldo.shared.security.PasswordPolicy;
import pl.saldo.shared.validation.MaxUtf8Bytes;

public record RegisterUserCommand(
		@NotBlank(message = "Imię jest wymagane")
		@Size(max = 60, message = "Imię może mieć maksymalnie 60 znaków")
		String firstName,

		@NotBlank(message = "Nazwisko jest wymagane")
		@Size(max = 60, message = "Nazwisko może mieć maksymalnie 60 znaków")
		String lastName,

		@NotBlank(message = "Adres e-mail jest wymagany")
		@Email(message = "Podaj poprawny adres e-mail, np. jan@example.com")
		@Size(max = 150, message = "Adres e-mail może mieć maksymalnie 150 znaków")
		String email,

		@NotBlank(message = "Hasło jest wymagane")
		@Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH,
				message = PasswordPolicy.LENGTH_MESSAGE)
		@Pattern(regexp = PasswordPolicy.DIGIT_REGEX, message = PasswordPolicy.DIGIT_MESSAGE)
		@Pattern(regexp = PasswordPolicy.UPPERCASE_REGEX, message = PasswordPolicy.UPPERCASE_MESSAGE)
		@Pattern(regexp = PasswordPolicy.SPECIAL_REGEX, message = PasswordPolicy.SPECIAL_MESSAGE)
		@MaxUtf8Bytes(value = PasswordPolicy.BCRYPT_MAX_BYTES, message = PasswordPolicy.TOO_MANY_BYTES_MESSAGE)
		String password) {

}
