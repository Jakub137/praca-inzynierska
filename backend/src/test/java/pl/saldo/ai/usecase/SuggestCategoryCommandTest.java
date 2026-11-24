package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import pl.saldo.transaction.domain.TransactionType;

class SuggestCategoryCommandTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
	private static final String DESCRIPTION = "Biedronka zakupy na weekend";
	private static final BigDecimal AMOUNT = new BigDecimal("184.50");
	private static final String DESCRIPTION_REQUIRED = "Opis transakcji jest wymagany";
	private static final String AMOUNT_POSITIVE = "Kwota musi być większa od zera";
	private static final String AMOUNT_DIGITS =
			"Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku";
	private static final String TYPE_INVALID = "Typ transakcji musi mieć wartość EXPENSE albo INCOME";

	@Test
	void shouldAcceptValidCommandWithoutType() {
		assertThat(violations(command(DESCRIPTION, AMOUNT, null))).isEmpty();
	}

	@Test
	void shouldAcceptBoundaryValues() {
		assertThat(violations(command("a".repeat(100), new BigDecimal("0.01"), "INCOME"))).isEmpty();
		assertThat(violations(command("a", new BigDecimal("9999999999.99"), "EXPENSE"))).isEmpty();
	}

	@Test
	void shouldRejectMissingDescriptionButAcceptMissingAmount() {
		assertThat(violations(command(null, null, null)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly(DESCRIPTION_REQUIRED);
	}

	@Test
	void shouldRejectBlankDescription() {
		assertThat(violations(command("   ", AMOUNT, null)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly(DESCRIPTION_REQUIRED);
	}

	@Test
	void shouldRejectDescriptionLongerThanOneHundredCharacters() {
		assertThat(violations(command("a".repeat(101), AMOUNT, null)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Opis może mieć maksymalnie 100 znaków");
	}

	@Test
	void shouldCountDescriptionLengthAfterTrim() {
		assertThat(violations(command("  " + "a".repeat(100) + "  ", AMOUNT, null))).isEmpty();
	}

	@Test
	void shouldRejectZeroAndNegativeAmount() {
		assertThat(violations(command(DESCRIPTION, BigDecimal.ZERO, null)))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_POSITIVE);
		assertThat(violations(command(DESCRIPTION, new BigDecimal("-5.00"), null)))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_POSITIVE);
	}

	@Test
	void shouldRejectAmountWithTooManyDigits() {
		assertThat(violations(command(DESCRIPTION, new BigDecimal("1.234"), null)))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_DIGITS);
		assertThat(violations(command(DESCRIPTION, new BigDecimal("10000000000.00"), null)))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_DIGITS);
	}

	@Test
	void shouldAcceptEveryTransactionTypeName() {
		assertThat(TransactionType.values()).allSatisfy(type -> {
			SuggestCategoryCommand command = command(DESCRIPTION, AMOUNT, type.name());

			assertThat(violations(command)).isEmpty();
			assertThat(command.transactionType()).isEqualTo(type);
		});
	}

	@Test
	void shouldRejectUnknownAndLowercaseType() {
		assertThat(List.of("TRANSFER", "expense", "")).allSatisfy(value ->
				assertThat(violations(command(DESCRIPTION, AMOUNT, value)))
						.extracting(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
						.containsExactly("type: " + TYPE_INVALID));
	}

	@Test
	void shouldDefaultToExpenseWhenTypeIsMissing() {
		assertThat(command(DESCRIPTION, AMOUNT, null).transactionType()).isEqualTo(TransactionType.EXPENSE);
	}

	@Test
	void shouldTrimDescription() {
		assertThat(command("  Biedronka  ", AMOUNT, null).description()).isEqualTo("Biedronka");
	}

	private static SuggestCategoryCommand command(String description, BigDecimal amount, String type) {
		return new SuggestCategoryCommand(description, amount, type);
	}

	private static Set<ConstraintViolation<SuggestCategoryCommand>> violations(SuggestCategoryCommand command) {
		return VALIDATOR.validate(command);
	}

}
