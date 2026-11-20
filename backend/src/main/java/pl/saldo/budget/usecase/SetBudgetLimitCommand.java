package pl.saldo.budget.usecase;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SetBudgetLimitCommand(
		@NotNull(message = "Kategoria jest wymagana")
		Long categoryId,

		@NotNull(message = "Miesiąc jest wymagany")
		@Min(value = MIN_MONTH, message = "Miesiąc musi być liczbą od 1 do 12")
		@Max(value = MAX_MONTH, message = "Miesiąc musi być liczbą od 1 do 12")
		Integer month,

		@NotNull(message = "Rok jest wymagany")
		@Min(value = MIN_YEAR, message = "Rok musi być liczbą od 2000 do 2100")
		@Max(value = MAX_YEAR, message = "Rok musi być liczbą od 2000 do 2100")
		Integer year,

		@NotNull(message = "Limit jest wymagany")
		@Positive(message = "Limit musi być większy od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Limit może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		BigDecimal limitAmount) {

	static final int MIN_MONTH = 1;
	static final int MAX_MONTH = 12;
	// The year range is an API validation bound only (not a database constraint): changing it needs no migration.
	static final int MIN_YEAR = 2000;
	static final int MAX_YEAR = 2100;

}
