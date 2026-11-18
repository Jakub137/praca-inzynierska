package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionType;

class CreateTransactionCommandTest {

	private static final int MAX_DESCRIPTION_LENGTH = 100;
	private static final LocalDate DATE = LocalDate.of(2026, 11, 17);
	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

	@Test
	void shouldAcceptValidCommand() {
		assertThat(VALIDATOR.validate(command("49.99", "Bilety"))).isEmpty();
	}

	@Test
	void shouldAcceptLargestAmountAllowedByColumn() {
		assertThat(VALIDATOR.validate(command("9999999999.99", null))).isEmpty();
	}

	@Test
	void shouldRejectAmountWithElevenIntegerDigits() {
		assertThat(messages(command("10000000000.00", null)))
				.containsExactly("Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	@Test
	void shouldRejectAmountWithThreeFractionDigits() {
		assertThat(messages(command("1.005", null)))
				.containsExactly("Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	@Test
	void shouldRejectZeroAmount() {
		assertThat(messages(command("0.00", null))).containsExactly("Kwota musi być większa od zera");
	}

	@Test
	void shouldRejectNegativeAmount() {
		assertThat(messages(command("-5.00", null))).containsExactly("Kwota musi być większa od zera");
	}

	@Test
	void shouldRejectMissingRequiredFields() {
		CreateTransactionCommand command = new CreateTransactionCommand(null, null, null, null, null, null);

		assertThat(messages(command)).containsExactlyInAnyOrder(
				"Kwota jest wymagana",
				"Waluta jest wymagana",
				"Kategoria jest wymagana",
				"Data transakcji jest wymagana",
				"Typ transakcji jest wymagany");
	}

	@Test
	void shouldTrimDescription() {
		assertThat(command("10.00", "  Bilety  ").description()).isEqualTo("Bilety");
	}

	@Test
	void shouldStoreBlankDescriptionAsNull() {
		assertThat(command("10.00", "   ").description()).isNull();
	}

	@Test
	void shouldAcceptDescriptionOfExactlyMaxLengthEvenWithSurroundingSpaces() {
		String description = "ą".repeat(MAX_DESCRIPTION_LENGTH);

		assertThat(VALIDATOR.validate(command("10.00", "  " + description + "  "))).isEmpty();
	}

	@Test
	void shouldRejectDescriptionLongerThanMaxLength() {
		String description = "ą".repeat(MAX_DESCRIPTION_LENGTH + 1);

		assertThat(messages(command("10.00", description)))
				.containsExactly("Opis może mieć maksymalnie 100 znaków");
	}

	private static CreateTransactionCommand command(String amount, String description) {
		return new CreateTransactionCommand(
				new BigDecimal(amount), SupportedCurrency.EUR, 1L, DATE, description, TransactionType.EXPENSE);
	}

	private static List<String> messages(CreateTransactionCommand command) {
		Set<ConstraintViolation<CreateTransactionCommand>> violations = VALIDATOR.validate(command);
		return violations.stream().map(ConstraintViolation::getMessage).toList();
	}

}
