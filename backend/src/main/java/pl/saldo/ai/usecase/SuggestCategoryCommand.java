package pl.saldo.ai.usecase;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import pl.saldo.transaction.domain.TransactionType;

public record SuggestCategoryCommand(
		@NotBlank(message = "Opis transakcji jest wymagany")
		@Size(max = 100, message = "Opis może mieć maksymalnie 100 znaków")
		@Schema(example = "Biedronka zakupy na weekend")
		String description,

		// Optional: the suggestion is requested while the user is still typing the description (T-070).
		@Positive(message = "Kwota musi być większa od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Kwota może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		@Schema(example = "184.50")
		BigDecimal amount,

		@Pattern(regexp = "EXPENSE|INCOME", message = "Typ transakcji musi mieć wartość EXPENSE albo INCOME")
		@Schema(allowableValues = { "EXPENSE", "INCOME" }, defaultValue = "EXPENSE")
		String type) {

	// Trimmed before Bean Validation runs, so the 100-character limit counts the text the user actually typed.
	public SuggestCategoryCommand {
		description = description == null ? null : description.trim();
	}

	public TransactionType transactionType() {
		return type == null ? TransactionType.EXPENSE : TransactionType.valueOf(type);
	}

}
