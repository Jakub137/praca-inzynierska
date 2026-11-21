package pl.saldo.budget.infrastructure;

import java.math.BigDecimal;

public record BudgetLimitRow(Long categoryId, String categoryName, BigDecimal limitAmount) {

}
