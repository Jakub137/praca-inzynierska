package pl.saldo.goal.usecase;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SavingsGoalCommand(
		@NotBlank(message = "Nazwa celu jest wymagana")
		@Size(max = MAX_NAME_LENGTH, message = "Nazwa celu może mieć maksymalnie 100 znaków")
		String name,

		@NotNull(message = "Kwota docelowa jest wymagana")
		@Positive(message = "Kwota docelowa musi być większa od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Kwota docelowa może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		BigDecimal targetAmount,

		@NotNull(message = "Termin celu jest wymagany")
		LocalDate targetDate) {

	// Equals VARCHAR(100) in V3_1 and maxLength on the frontend input (wspolne/walidacja.md).
	static final int MAX_NAME_LENGTH = 100;

}
