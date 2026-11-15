package pl.saldo.auth.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import pl.saldo.shared.security.PasswordPolicy;

class RegisterUserCommandValidationTest {

	private static final String VALID_PASSWORD = "Secret#123";
	private static final String NAME_TOO_LONG_MESSAGE_SUFFIX = "może mieć maksymalnie 60 znaków";

	private static ValidatorFactory validatorFactory;
	private static Validator validator;

	@BeforeAll
	static void setUpValidator() {
		validatorFactory = Validation.buildDefaultValidatorFactory();
		validator = validatorFactory.getValidator();
	}

	@AfterAll
	static void closeValidator() {
		validatorFactory.close();
	}

	@Test
	void shouldAcceptValidCommand() {
		assertThat(validator.validate(command("Jan", "Kowalski", "jan@example.com", VALID_PASSWORD))).isEmpty();
	}

	@Test
	void shouldAcceptPasswordOfSixtyFourCharacters() {
		assertThat(passwordMessages("A1!" + "a".repeat(61))).isEmpty();
	}

	@Test
	void shouldRejectPasswordOfSixtyFiveCharacters() {
		assertThat(passwordMessages("A1!" + "a".repeat(62))).containsExactly(PasswordPolicy.LENGTH_MESSAGE);
	}

	@Test
	void shouldRejectPasswordShorterThanEightCharacters() {
		assertThat(passwordMessages("Ab1!xyz")).containsExactly(PasswordPolicy.LENGTH_MESSAGE);
	}

	@Test
	void shouldRequireDigitInPassword() {
		assertThat(passwordMessages("Secret#abc")).containsExactly(PasswordPolicy.DIGIT_MESSAGE);
	}

	@Test
	void shouldRequireUppercaseLetterInPassword() {
		assertThat(passwordMessages("secret#123")).containsExactly(PasswordPolicy.UPPERCASE_MESSAGE);
	}

	@Test
	void shouldRequireSpecialCharacterInPassword() {
		assertThat(passwordMessages("Secret1234")).containsExactly(PasswordPolicy.SPECIAL_MESSAGE);
	}

	@Test
	void shouldAcceptPasswordOfExactlySeventyTwoUtf8Bytes() {
		String password = "A1!" + "ą".repeat(34) + "a";

		assertThat(password.getBytes(StandardCharsets.UTF_8)).hasSize(PasswordPolicy.BCRYPT_MAX_BYTES);
		assertThat(passwordMessages(password)).isEmpty();
	}

	@Test
	void shouldRejectPasswordOfSeventyThreeUtf8BytesEvenWhenItHasFewCharacters() {
		String password = "A1!" + "ą".repeat(35);

		assertThat(password.length()).isLessThanOrEqualTo(PasswordPolicy.MAX_LENGTH);
		assertThat(password.getBytes(StandardCharsets.UTF_8)).hasSize(PasswordPolicy.BCRYPT_MAX_BYTES + 1);
		assertThat(passwordMessages(password)).containsExactly(PasswordPolicy.TOO_MANY_BYTES_MESSAGE);
	}

	@Test
	void shouldRejectBlankNamesAndEmail() {
		RegisterUserCommand command = command("", " ", "", VALID_PASSWORD);

		assertThat(messagesFor(command, "firstName")).containsExactly("Imię jest wymagane");
		assertThat(messagesFor(command, "lastName")).containsExactly("Nazwisko jest wymagane");
		assertThat(messagesFor(command, "email")).containsExactly("Adres e-mail jest wymagany");
	}

	@Test
	void shouldRejectMalformedEmail() {
		RegisterUserCommand command = command("Jan", "Kowalski", "not-an-email", VALID_PASSWORD);

		assertThat(messagesFor(command, "email"))
				.containsExactly("Podaj poprawny adres e-mail, np. jan@example.com");
	}

	@Test
	void shouldAcceptEmailOfOneHundredFiftyCharacters() {
		String email = emailOfLength(150);

		assertThat(email).hasSize(150);
		assertThat(messagesFor(command("Jan", "Kowalski", email, VALID_PASSWORD), "email")).isEmpty();
	}

	@Test
	void shouldRejectEmailOfOneHundredFiftyOneCharacters() {
		String email = emailOfLength(151);

		assertThat(email).hasSize(151);
		assertThat(messagesFor(command("Jan", "Kowalski", email, VALID_PASSWORD), "email"))
				.containsExactly("Adres e-mail może mieć maksymalnie 150 znaków");
	}

	@Test
	void shouldAcceptNamesOfSixtyCharacters() {
		RegisterUserCommand command = command("a".repeat(60), "b".repeat(60), "jan@example.com", VALID_PASSWORD);

		assertThat(validator.validate(command)).isEmpty();
	}

	@Test
	void shouldRejectNamesOfSixtyOneCharacters() {
		RegisterUserCommand command = command("a".repeat(61), "b".repeat(61), "jan@example.com", VALID_PASSWORD);

		assertThat(messagesFor(command, "firstName")).containsExactly("Imię " + NAME_TOO_LONG_MESSAGE_SUFFIX);
		assertThat(messagesFor(command, "lastName")).containsExactly("Nazwisko " + NAME_TOO_LONG_MESSAGE_SUFFIX);
	}

	private static Set<String> passwordMessages(String password) {
		return messagesFor(command("Jan", "Kowalski", "jan@example.com", password), "password");
	}

	private static Set<String> messagesFor(RegisterUserCommand command, String property) {
		return validator.validateProperty(command, property).stream()
				.map(ConstraintViolation::getMessage)
				.collect(Collectors.toSet());
	}

	private static RegisterUserCommand command(String firstName, String lastName, String email, String password) {
		return new RegisterUserCommand(firstName, lastName, email, password);
	}

	// Hibernate Validator limits the local part to 64 and each domain label to 63 characters.
	private static String emailOfLength(int length) {
		String localPart = "a".repeat(64);
		String domainLabel = "b".repeat(63);
		int topLevelLength = length - localPart.length() - 1 - domainLabel.length() - 1;
		return localPart + "@" + domainLabel + "." + "c".repeat(topLevelLength);
	}

}
