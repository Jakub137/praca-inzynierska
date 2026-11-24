package pl.saldo.ai.api;

import java.math.BigDecimal;

import pl.saldo.ai.domain.SpendingAnomaly;
import pl.saldo.ai.domain.SpendingAnomalyDetector;

public record DashboardInsightResponse(
		Long categoryId,
		String categoryName,
		Integer increasePercent,
		BigDecimal currentAmount,
		BigDecimal averageAmount,
		String message) {

	private static final String MESSAGE_TEMPLATE = "W kategorii %s wydałeś o %d%% więcej niż średnio w ostatnich %d miesiącach.";

	public static DashboardInsightResponse fromAnomaly(SpendingAnomaly anomaly) {
		return new DashboardInsightResponse(
				anomaly.categoryId(),
				anomaly.categoryName(),
				anomaly.increasePercent(),
				anomaly.currentAmount(),
				anomaly.averageAmount(),
				MESSAGE_TEMPLATE.formatted(
						anomaly.categoryName(), anomaly.increasePercent(), SpendingAnomalyDetector.BASELINE_MONTHS));
	}

	public static DashboardInsightResponse empty() {
		return new DashboardInsightResponse(null, null, null, null, null, null);
	}

}
