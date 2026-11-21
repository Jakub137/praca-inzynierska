package pl.saldo.recurring.usecase;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.recurring.api.RecurringPaymentResponse;
import pl.saldo.recurring.domain.RecurringPaymentCategoryNotExpenseException;
import pl.saldo.recurring.domain.RecurringPaymentDates;
import pl.saldo.recurring.domain.RecurringPaymentEntity;
import pl.saldo.recurring.infrastructure.RecurringPaymentRepository;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionType;

@Service
public class CreateRecurringPaymentUseCase {

	private final RecurringPaymentRepository recurringPaymentRepository;
	private final CategoryRepository categoryRepository;
	private final Clock clock;

	public CreateRecurringPaymentUseCase(
			RecurringPaymentRepository recurringPaymentRepository,
			CategoryRepository categoryRepository,
			Clock clock) {
		this.recurringPaymentRepository = recurringPaymentRepository;
		this.categoryRepository = categoryRepository;
		this.clock = clock;
	}

	@Transactional
	public RecurringPaymentResponse execute(UUID userId, RecurringPaymentCommand command) {
		RecurringPaymentDates.requireValidNextDueDate(RecurringPaymentDates.today(clock), command.nextDueDate());
		CategoryEntity category = findExpenseCategory(userId, command.categoryId());
		RecurringPaymentEntity payment = new RecurringPaymentEntity(
				userId,
				command.name(),
				command.amount(),
				command.currency(),
				command.frequency(),
				command.nextDueDate(),
				category,
				Instant.now(clock));
		return RecurringPaymentResponse.fromEntity(recurringPaymentRepository.save(payment));
	}

	// A missing and a foreign category are indistinguishable for the caller (404); system categories are allowed.
	private CategoryEntity findExpenseCategory(UUID userId, Long categoryId) {
		CategoryEntity category = categoryRepository.findAccessibleById(categoryId, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
		if (category.getType() != TransactionType.EXPENSE) {
			throw new RecurringPaymentCategoryNotExpenseException();
		}
		return category;
	}

}
