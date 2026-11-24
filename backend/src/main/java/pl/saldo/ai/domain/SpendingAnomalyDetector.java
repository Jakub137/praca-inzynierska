package pl.saldo.ai.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class SpendingAnomalyDetector {

	public static final int BASELINE_MONTHS = 3;
	public static final int THRESHOLD_PERCENT = 30;

	private static final int AMOUNT_SCALE = 2;
	private static final BigDecimal PERCENT_BASE = BigDecimal.valueOf(100);
	private static final BigDecimal BASELINE_MONTHS_VALUE = BigDecimal.valueOf(BASELINE_MONTHS);
	private static final BigDecimal THRESHOLD_FACTOR = BigDecimal.valueOf(100 + THRESHOLD_PERCENT);

	// Strongest first: higher rounded percentage, then higher current amount, then name and id, so the result
	// never depends on the order of the database rows.
	private static final Comparator<SpendingAnomaly> STRONGEST_FIRST = Comparator
			.comparing(SpendingAnomaly::increasePercent, Comparator.reverseOrder())
			.thenComparing(SpendingAnomaly::currentAmount, Comparator.reverseOrder())
			.thenComparing(SpendingAnomaly::categoryName)
			.thenComparing(SpendingAnomaly::categoryId);

	private SpendingAnomalyDetector() {
	}

	public static Optional<SpendingAnomaly> findStrongest(List<CategorySpendingHistory> histories) {
		return histories.stream()
				.map(SpendingAnomalyDetector::toAnomaly)
				.flatMap(Optional::stream)
				.min(STRONGEST_FIRST);
	}

	private static Optional<SpendingAnomaly> toAnomaly(CategorySpendingHistory history) {
		requireBaselineLength(history);
		if (!hasExpensesInEveryBaselineMonth(history)) {
			return Optional.empty();
		}
		BigDecimal baselineTotal = history.previousAmounts().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal current = history.currentAmount();
		if (!exceedsThreshold(current, baselineTotal)) {
			return Optional.empty();
		}
		return Optional.of(new SpendingAnomaly(
				history.categoryId(),
				history.categoryName(),
				increasePercent(current, baselineTotal),
				current.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY),
				baselineTotal.divide(BASELINE_MONTHS_VALUE, AMOUNT_SCALE, RoundingMode.HALF_UP)));
	}

	private static void requireBaselineLength(CategorySpendingHistory history) {
		if (history.previousAmounts().size() != BASELINE_MONTHS) {
			throw new IllegalArgumentException("Expected " + BASELINE_MONTHS + " baseline months");
		}
	}

	// A zero month would pull the average down and raise a false alarm for a new category or one paid once a quarter.
	private static boolean hasExpensesInEveryBaselineMonth(CategorySpendingHistory history) {
		return history.previousAmounts().stream().allMatch(amount -> amount.signum() > 0);
	}

	// current > average * (100 + threshold) / 100, compared on the exact total (multiplied by months * 100), so that
	// rounding of the average cannot move a category across the threshold.
	private static boolean exceedsThreshold(BigDecimal current, BigDecimal baselineTotal) {
		BigDecimal scaledCurrent = current.multiply(BASELINE_MONTHS_VALUE).multiply(PERCENT_BASE);
		return scaledCurrent.compareTo(baselineTotal.multiply(THRESHOLD_FACTOR)) > 0;
	}

	// (current - average) / average * 100 = (current * months - total) * 100 / total, rounded to a whole percent.
	private static int increasePercent(BigDecimal current, BigDecimal baselineTotal) {
		return current.multiply(BASELINE_MONTHS_VALUE).subtract(baselineTotal)
				.multiply(PERCENT_BASE)
				.divide(baselineTotal, 0, RoundingMode.HALF_UP)
				.intValueExact();
	}

}
