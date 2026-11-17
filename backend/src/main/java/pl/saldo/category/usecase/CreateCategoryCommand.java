package pl.saldo.category.usecase;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pl.saldo.transaction.domain.TransactionType;

public record CreateCategoryCommand(
		@NotBlank(message = "Nazwa kategorii jest wymagana")
		@Size(max = 60, message = "Nazwa kategorii może mieć maksymalnie 60 znaków")
		String name,

		@NotNull(message = "Typ kategorii jest wymagany")
		TransactionType type) {

	// Trimmed before Bean Validation runs, so the length limit and the duplicate check see the stored value.
	public CreateCategoryCommand {
		name = name == null ? null : name.trim();
	}

}
