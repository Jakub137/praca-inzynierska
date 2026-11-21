package pl.saldo.budget.api;

import java.math.BigDecimal;

import pl.saldo.budget.domain.BudgetStatus;

public record BudgetUsageResponse(
		Long categoryId,
		String categoryName,
		BigDecimal limitAmount,
		BigDecimal spentAmount,
		BigDecimal percentage,
		BudgetStatus status) {

}
