package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class SavingsGoalCommandTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
	private static final LocalDate DATE = LocalDate.of(2027, 7, 15);
	private static final BigDecimal AMOUNT = new BigDecimal("6000.00");

	@Test
	void shouldAcceptValidCommand() {
		assertThat(violations(new SavingsGoalCommand("Wakacje we Włoszech", AMOUNT, DATE))).isEmpty();
	}

	@Test
	void shouldAcceptBoundaryValues() {
		assertThat(violations(new SavingsGoalCommand("a".repeat(100), new BigDecimal("0.01"), DATE))).isEmpty();
		assertThat(violations(new SavingsGoalCommand("a", new BigDecimal("9999999999.99"), DATE))).isEmpty();
	}

	@Test
	void shouldRejectMissingFields() {
		assertThat(violations(new SavingsGoalCommand(null, null, null)))
				.extracting(ConstraintViolation::getMessage).containsExactlyInAnyOrder(
						"Nazwa celu jest wymagana",
						"Kwota docelowa jest wymagana",
						"Termin celu jest wymagany");
	}

	@Test
	void shouldRejectBlankName() {
		assertThat(violations(new SavingsGoalCommand("   ", AMOUNT, DATE)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Nazwa celu jest wymagana");
	}

	@Test
	void shouldRejectNameLongerThanOneHundredCharacters() {
		assertThat(violations(new SavingsGoalCommand("a".repeat(101), AMOUNT, DATE)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Nazwa celu może mieć maksymalnie 100 znaków");
	}

	@Test
	void shouldRejectZeroAndNegativeAmount() {
		assertThat(violations(new SavingsGoalCommand("Cel", BigDecimal.ZERO, DATE)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Kwota docelowa musi być większa od zera");
		assertThat(violations(new SavingsGoalCommand("Cel", new BigDecimal("-5.00"), DATE)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Kwota docelowa musi być większa od zera");
	}

	@Test
	void shouldRejectAmountWithThreeDecimals() {
		assertThat(violations(new SavingsGoalCommand("Cel", new BigDecimal("10.123"), DATE)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Kwota docelowa może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	@Test
	void shouldRejectAmountWithElevenIntegerDigits() {
		assertThat(violations(new SavingsGoalCommand("Cel", new BigDecimal("10000000000.00"), DATE)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Kwota docelowa może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	private static Set<ConstraintViolation<SavingsGoalCommand>> violations(SavingsGoalCommand command) {
		return VALIDATOR.validate(command);
	}

}
