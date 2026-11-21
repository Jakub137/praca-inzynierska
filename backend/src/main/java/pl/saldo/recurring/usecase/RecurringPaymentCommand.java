package pl.saldo.recurring.usecase;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.domain.PaymentFrequency;

public record RecurringPaymentCommand(
		@NotBlank(message = "Nazwa płatności jest wymagana")
		@Size(max = MAX_NAME_LENGTH, message = "Nazwa płatności może mieć maksymalnie 100 znaków")
		String name,

		@NotNull(message = "Kwota jest wymagana")
		@Positive(message = "Kwota musi być większa od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		BigDecimal amount,

		@NotNull(message = "Waluta jest wymagana")
		SupportedCurrency currency,

		@NotNull(message = "Częstotliwość jest wymagana")
		PaymentFrequency frequency,

		@NotNull(message = "Termin następnej płatności jest wymagany")
		LocalDate nextDueDate,

		@NotNull(message = "Kategoria jest wymagana")
		Long categoryId) {

	// Equals VARCHAR(100) in V3_2 and maxLength on the frontend input (wspolne/walidacja.md).
	static final int MAX_NAME_LENGTH = 100;

}
