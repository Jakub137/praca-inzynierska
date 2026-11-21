package pl.saldo.goal.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class MonthlyContributionCalculator {

	private static final int AMOUNT_SCALE = 2;

	private MonthlyContributionCalculator() {
	}

	// Whole months only (the day of month counts); negative once the deadline has passed.
	public static long monthsRemaining(LocalDate today, LocalDate targetDate) {
		return ChronoUnit.MONTHS.between(today, targetDate);
	}

	// CEILING, not HALF_UP: rounding down could leave the instalments short of the goal (3 x 333.33 = 999.99).
	// Without a full month left the whole remainder is due now, which also avoids dividing by zero.
	// A reached or exceeded goal has nothing remaining, so the result is 0.00.
	public static BigDecimal monthlyContribution(
			BigDecimal targetAmount, BigDecimal currentAmount, long monthsRemaining) {
		BigDecimal remaining = targetAmount.subtract(currentAmount)
				.max(BigDecimal.ZERO)
				.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
		if (monthsRemaining <= 0) {
			return remaining;
		}
		return remaining.divide(BigDecimal.valueOf(monthsRemaining), AMOUNT_SCALE, RoundingMode.CEILING);
	}

}
