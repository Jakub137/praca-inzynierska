package pl.saldo.transaction.usecase;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionType;

public record UpdateTransactionCommand(
		@NotNull(message = "Kwota jest wymagana")
		@Positive(message = "Kwota musi być większa od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		BigDecimal amount,

		@NotNull(message = "Waluta jest wymagana")
		SupportedCurrency currency,

		@NotNull(message = "Kategoria jest wymagana")
		Long categoryId,

		@NotNull(message = "Data transakcji jest wymagana")
		LocalDate date,

		@Size(max = 100, message = "Opis może mieć maksymalnie 100 znaków")
		String description,

		@NotNull(message = "Typ transakcji jest wymagany")
		TransactionType type) {

	// Trimmed before Bean Validation runs; a blank description is stored as NULL.
	public UpdateTransactionCommand {
		description = description == null || description.isBlank() ? null : description.trim();
	}

}
