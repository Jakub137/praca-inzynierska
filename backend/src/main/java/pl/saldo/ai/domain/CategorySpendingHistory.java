package pl.saldo.ai.domain;

import java.math.BigDecimal;
import java.util.List;

// previousAmounts holds one PLN total per baseline month; a month without expenses is zero.
public record CategorySpendingHistory(
		Long categoryId, String categoryName, BigDecimal currentAmount, List<BigDecimal> previousAmounts) {

	public CategorySpendingHistory {
		previousAmounts = List.copyOf(previousAmounts);
	}

}
