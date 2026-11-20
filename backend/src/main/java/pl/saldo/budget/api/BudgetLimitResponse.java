package pl.saldo.budget.api;

import java.math.BigDecimal;

import pl.saldo.budget.domain.BudgetLimitEntity;

public record BudgetLimitResponse(
		Long id,
		Long categoryId,
		int month,
		int year,
		BigDecimal limitAmount) {

	public static BudgetLimitResponse fromEntity(BudgetLimitEntity limit) {
		return new BudgetLimitResponse(
				limit.getId(),
				limit.getCategoryId(),
				limit.getMonth(),
				limit.getYear(),
				limit.getLimitAmount());
	}

}
