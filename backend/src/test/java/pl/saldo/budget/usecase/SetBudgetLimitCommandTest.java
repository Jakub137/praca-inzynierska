package pl.saldo.budget.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class SetBudgetLimitCommandTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
	private static final BigDecimal AMOUNT = new BigDecimal("1500.00");

	@Test
	void shouldAcceptValidCommand() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2026, AMOUNT))).isEmpty();
	}

	@Test
	void shouldAcceptBoundaryValues() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 1, 2000, new BigDecimal("0.01")))).isEmpty();
		assertThat(violations(new SetBudgetLimitCommand(1L, 12, 2100, new BigDecimal("9999999999.99")))).isEmpty();
	}

	@Test
	void shouldRejectMissingFields() {
		Set<ConstraintViolation<SetBudgetLimitCommand>> violations =
				violations(new SetBudgetLimitCommand(null, null, null, null));

		assertThat(violations).extracting(ConstraintViolation::getMessage).containsExactlyInAnyOrder(
				"Kategoria jest wymagana",
				"Miesiąc jest wymagany",
				"Rok jest wymagany",
				"Limit jest wymagany");
	}

	@Test
	void shouldRejectZeroAndNegativeAmount() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2026, BigDecimal.ZERO)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Limit musi być większy od zera");
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2026, new BigDecimal("-5.00"))))
				.extracting(ConstraintViolation::getMessage).containsExactly("Limit musi być większy od zera");
	}

	@Test
	void shouldRejectAmountWithThreeDecimals() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2026, new BigDecimal("10.123"))))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Limit może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	@Test
	void shouldRejectAmountWithElevenIntegerDigits() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2026, new BigDecimal("10000000000.00"))))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Limit może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku");
	}

	@Test
	void shouldRejectMonthOutsideOneToTwelve() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 0, 2026, AMOUNT)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Miesiąc musi być liczbą od 1 do 12");
		assertThat(violations(new SetBudgetLimitCommand(1L, 13, 2026, AMOUNT)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Miesiąc musi być liczbą od 1 do 12");
	}

	@Test
	void shouldRejectYearOutsideApiRange() {
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 1999, AMOUNT)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Rok musi być liczbą od 2000 do 2100");
		assertThat(violations(new SetBudgetLimitCommand(1L, 11, 2101, AMOUNT)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Rok musi być liczbą od 2000 do 2100");
	}

	private static Set<ConstraintViolation<SetBudgetLimitCommand>> violations(SetBudgetLimitCommand command) {
		return VALIDATOR.validate(command);
	}

}
