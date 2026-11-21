package pl.saldo.budget.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class BudgetUsageCalculator {

	public static final BigDecimal WARNING_THRESHOLD_PERCENT = BigDecimal.valueOf(80);
	public static final BigDecimal EXCEEDED_THRESHOLD_PERCENT = BigDecimal.valueOf(100);

	private static final BigDecimal PERCENT_BASE = BigDecimal.valueOf(100);
	private static final int PERCENTAGE_SCALE = 2;

	private BudgetUsageCalculator() {
	}

	// May exceed 100 when the limit is overspent.
	public static BigDecimal percentage(BigDecimal spent, BigDecimal limit) {
		requirePositive(limit);
		return spent.multiply(PERCENT_BASE).divide(limit, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
	}

	// Compares exact amounts (spent * 100 against limit * threshold): a rounded percentage would show 80.00 for
	// 79.9999 and wrongly raise the warning early.
	public static BudgetStatus status(BigDecimal spent, BigDecimal limit) {
		requirePositive(limit);
		BigDecimal scaledSpent = spent.multiply(PERCENT_BASE);
		if (scaledSpent.compareTo(limit.multiply(EXCEEDED_THRESHOLD_PERCENT)) >= 0) {
			return BudgetStatus.EXCEEDED;
		}
		if (scaledSpent.compareTo(limit.multiply(WARNING_THRESHOLD_PERCENT)) >= 0) {
			return BudgetStatus.WARNING;
		}
		return BudgetStatus.NORMAL;
	}

	private static void requirePositive(BigDecimal limit) {
		if (limit.signum() <= 0) {
			throw new IllegalArgumentException("Budget limit must be positive");
		}
	}

}
