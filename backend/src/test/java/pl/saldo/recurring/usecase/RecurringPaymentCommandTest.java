package pl.saldo.recurring.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.domain.PaymentFrequency;

class RecurringPaymentCommandTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
	private static final String NAME = "Netflix";
	private static final BigDecimal AMOUNT = new BigDecimal("43.00");
	private static final LocalDate DATE = LocalDate.of(2027, 1, 15);
	private static final Long CATEGORY_ID = 5L;
	private static final String AMOUNT_DIGITS_MESSAGE =
			"Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku";

	@Test
	void shouldAcceptValidCommand() {
		assertThat(violations(command(NAME, AMOUNT))).isEmpty();
	}

	@Test
	void shouldAcceptBoundaryValues() {
		assertThat(violations(command("a".repeat(100), new BigDecimal("0.01")))).isEmpty();
		assertThat(violations(command("a", new BigDecimal("9999999999.99")))).isEmpty();
	}

	@Test
	void shouldRejectMissingFields() {
		assertThat(violations(new RecurringPaymentCommand(null, null, null, null, null, null)))
				.extracting(ConstraintViolation::getMessage).containsExactlyInAnyOrder(
						"Nazwa płatności jest wymagana",
						"Kwota jest wymagana",
						"Waluta jest wymagana",
						"Częstotliwość jest wymagana",
						"Termin następnej płatności jest wymagany",
						"Kategoria jest wymagana");
	}

	@Test
	void shouldRejectBlankName() {
		assertThat(violations(command("   ", AMOUNT)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Nazwa płatności jest wymagana");
	}

	@Test
	void shouldRejectNameLongerThanOneHundredCharacters() {
		assertThat(violations(command("a".repeat(101), AMOUNT)))
				.extracting(ConstraintViolation::getMessage)
				.containsExactly("Nazwa płatności może mieć maksymalnie 100 znaków");
	}

	@Test
	void shouldRejectZeroAndNegativeAmount() {
		assertThat(violations(command(NAME, BigDecimal.ZERO)))
				.extracting(ConstraintViolation::getMessage).containsExactly("Kwota musi być większa od zera");
		assertThat(violations(command(NAME, new BigDecimal("-5.00"))))
				.extracting(ConstraintViolation::getMessage).containsExactly("Kwota musi być większa od zera");
	}

	@Test
	void shouldRejectAmountWithThreeDecimals() {
		assertThat(violations(command(NAME, new BigDecimal("10.123"))))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_DIGITS_MESSAGE);
	}

	@Test
	void shouldRejectAmountWithElevenIntegerDigits() {
		assertThat(violations(command(NAME, new BigDecimal("10000000000.00"))))
				.extracting(ConstraintViolation::getMessage).containsExactly(AMOUNT_DIGITS_MESSAGE);
	}

	private static RecurringPaymentCommand command(String name, BigDecimal amount) {
		return new RecurringPaymentCommand(
				name, amount, SupportedCurrency.PLN, PaymentFrequency.MONTHLY, DATE, CATEGORY_ID);
	}

	private static Set<ConstraintViolation<RecurringPaymentCommand>> violations(RecurringPaymentCommand command) {
		return VALIDATOR.validate(command);
	}

}
