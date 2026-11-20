package pl.saldo.budget.usecase;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.budget.api.BudgetLimitResponse;
import pl.saldo.budget.domain.BudgetCategoryNotExpenseException;
import pl.saldo.budget.domain.BudgetLimitConflictException;
import pl.saldo.budget.domain.BudgetLimitEntity;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionType;

@Service
public class SetBudgetLimitUseCase {

	private final BudgetLimitRepository budgetLimitRepository;
	private final CategoryRepository categoryRepository;
	private final Clock clock;

	public SetBudgetLimitUseCase(
			BudgetLimitRepository budgetLimitRepository,
			CategoryRepository categoryRepository,
			Clock clock) {
		this.budgetLimitRepository = budgetLimitRepository;
		this.categoryRepository = categoryRepository;
		this.clock = clock;
	}

	@Transactional
	public SetBudgetLimitResult execute(UUID userId, SetBudgetLimitCommand command) {
		CategoryEntity category = findExpenseCategory(userId, command.categoryId());
		return budgetLimitRepository
				.findByUserIdAndYearAndMonthAndCategoryId(userId, command.year(), command.month(), category.getId())
				.map(existing -> update(existing, command.limitAmount()))
				.orElseGet(() -> create(userId, category.getId(), command));
	}

	// A missing and a foreign category are indistinguishable for the caller (404); system categories are allowed.
	private CategoryEntity findExpenseCategory(UUID userId, Long categoryId) {
		CategoryEntity category = categoryRepository.findAccessibleById(categoryId, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
		if (category.getType() != TransactionType.EXPENSE) {
			throw new BudgetCategoryNotExpenseException();
		}
		return category;
	}

	// The key (user, year, month, category) is unchanged, so this branch cannot violate the unique constraint.
	private SetBudgetLimitResult update(BudgetLimitEntity existing, BigDecimal limitAmount) {
		existing.changeLimitAmount(limitAmount);
		return new SetBudgetLimitResult(false, BudgetLimitResponse.fromEntity(existing));
	}

	// saveAndFlush, not save: the violation must surface inside this try/catch. With IDENTITY ids the INSERT already
	// runs on persist, but the flush keeps that guarantee independent of the id strategy (a sequence-based id would
	// delay the INSERT to commit, after this method returns, and the violation would end as HTTP 500).
	// The only constraints an INSERT can break here are the unique key (a parallel POST won) or a foreign key
	// (user or category deleted in parallel); both are a conflict. The command validation precedes the CHECKs.
	private SetBudgetLimitResult create(UUID userId, Long categoryId, SetBudgetLimitCommand command) {
		BudgetLimitEntity limit = new BudgetLimitEntity(
				userId, categoryId, command.month(), command.year(), command.limitAmount(), Instant.now(clock));
		try {
			return new SetBudgetLimitResult(true, BudgetLimitResponse.fromEntity(budgetLimitRepository.saveAndFlush(limit)));
		} catch (DataIntegrityViolationException ex) {
			throw new BudgetLimitConflictException(ex);
		}
	}

}
