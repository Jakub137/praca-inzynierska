package pl.saldo.ai.domain;

import java.math.BigDecimal;

public record SpendingAnomaly(
		Long categoryId, String categoryName, int increasePercent, BigDecimal currentAmount, BigDecimal averageAmount) {

}
