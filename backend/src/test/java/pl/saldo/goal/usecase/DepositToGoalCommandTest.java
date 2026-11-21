package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class DepositToGoalCommandTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
	private static final String DIGITS_MESSAGE =
			"Kwota wpłaty może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku";

	@Test
	void shouldAcceptValidAmount() {
		assertThat(violations(new BigDecimal("500.00"))).isEmpty();
	}

	@Test
	void shouldAcceptBoundaryValues() {
		assertThat(violations(new BigDecimal("0.01"))).isEmpty();
		assertThat(violations(new BigDecimal("9999999999.99"))).isEmpty();
	}

	@Test
	void shouldRejectMissingAmount() {
		assertThat(violations(null)).extracting(ConstraintViolation::getMessage)
				.containsExactly("Kwota wpłaty jest wymagana");
	}

	@Test
	void shouldRejectZeroAndNegativeAmount() {
		assertThat(violations(BigDecimal.ZERO)).extracting(ConstraintViolation::getMessage)
				.containsExactly("Kwota wpłaty musi być większa od zera");
		assertThat(violations(new BigDecimal("-5.00"))).extracting(ConstraintViolation::getMessage)
				.containsExactly("Kwota wpłaty musi być większa od zera");
	}

	@Test
	void shouldRejectAmountWithThreeDecimals() {
		assertThat(violations(new BigDecimal("10.123"))).extracting(ConstraintViolation::getMessage)
				.containsExactly(DIGITS_MESSAGE);
	}

	@Test
	void shouldRejectAmountWithElevenIntegerDigits() {
		assertThat(violations(new BigDecimal("10000000000.00"))).extracting(ConstraintViolation::getMessage)
				.containsExactly(DIGITS_MESSAGE);
	}

	private static Set<ConstraintViolation<DepositToGoalCommand>> violations(BigDecimal amount) {
		return VALIDATOR.validate(new DepositToGoalCommand(amount));
	}

}
