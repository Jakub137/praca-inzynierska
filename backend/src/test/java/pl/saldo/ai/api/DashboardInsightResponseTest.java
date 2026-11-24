package pl.saldo.ai.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import pl.saldo.ai.domain.SpendingAnomaly;

class DashboardInsightResponseTest {

	@Test
	void shouldCopyFieldsAndBuildPolishMessage() {
		SpendingAnomaly anomaly = new SpendingAnomaly(
				2L, "Rozrywka", 42, new BigDecimal("142.00"), new BigDecimal("100.00"));

		DashboardInsightResponse result = DashboardInsightResponse.fromAnomaly(anomaly);

		assertThat(result).isEqualTo(new DashboardInsightResponse(
				2L, "Rozrywka", 42, new BigDecimal("142.00"), new BigDecimal("100.00"),
				"W kategorii Rozrywka wydałeś o 42% więcej niż średnio w ostatnich 3 miesiącach."));
	}

	@Test
	void shouldReturnAllNullFieldsWhenThereIsNoInsight() {
		assertThat(DashboardInsightResponse.empty())
				.isEqualTo(new DashboardInsightResponse(null, null, null, null, null, null));
	}

}
