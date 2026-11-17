package pl.saldo.category.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import pl.saldo.transaction.domain.TransactionType;

class CreateCategoryCommandTest {

	private static final int MAX_NAME_LENGTH = 60;
	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

	@Test
	void shouldTrimNameOnCreation() {
		CreateCategoryCommand command = new CreateCategoryCommand("  Bilety  ", TransactionType.EXPENSE);

		assertThat(command.name()).isEqualTo("Bilety");
	}

	@Test
	void shouldAcceptNameOfExactlyMaxLengthEvenWithSurroundingSpaces() {
		String name = "ą".repeat(MAX_NAME_LENGTH);

		Set<ConstraintViolation<CreateCategoryCommand>> violations =
				VALIDATOR.validate(new CreateCategoryCommand("  " + name + "  ", TransactionType.EXPENSE));

		assertThat(violations).isEmpty();
	}

	@Test
	void shouldRejectNameLongerThanMaxLength() {
		String name = "ą".repeat(MAX_NAME_LENGTH + 1);

		Set<ConstraintViolation<CreateCategoryCommand>> violations =
				VALIDATOR.validate(new CreateCategoryCommand(name, TransactionType.EXPENSE));

		assertThat(violations).extracting(ConstraintViolation::getMessage)
				.containsExactly("Nazwa kategorii może mieć maksymalnie 60 znaków");
	}

	@Test
	void shouldRejectBlankName() {
		Set<ConstraintViolation<CreateCategoryCommand>> violations =
				VALIDATOR.validate(new CreateCategoryCommand("   ", TransactionType.EXPENSE));

		assertThat(violations).extracting(ConstraintViolation::getMessage)
				.containsExactly("Nazwa kategorii jest wymagana");
	}

	@Test
	void shouldRejectMissingNameWithoutThrowingOnTrim() {
		Set<ConstraintViolation<CreateCategoryCommand>> violations =
				VALIDATOR.validate(new CreateCategoryCommand(null, TransactionType.EXPENSE));

		assertThat(violations).extracting(ConstraintViolation::getMessage)
				.containsExactly("Nazwa kategorii jest wymagana");
	}

	@Test
	void shouldRejectMissingType() {
		Set<ConstraintViolation<CreateCategoryCommand>> violations =
				VALIDATOR.validate(new CreateCategoryCommand("Bilety", null));

		assertThat(violations).extracting(ConstraintViolation::getMessage)
				.containsExactly("Typ kategorii jest wymagany");
	}

}
