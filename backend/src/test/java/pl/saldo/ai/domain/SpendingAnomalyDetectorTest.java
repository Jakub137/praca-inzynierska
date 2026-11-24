package pl.saldo.ai.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

class SpendingAnomalyDetectorTest {

	@Test
	void shouldFlagCategoryThatGrewMoreThanThirtyPercentAboveAverage() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "142", "100", "100", "100")));

		assertThat(result).contains(anomaly(1L, "Rozrywka", 42, "142.00", "100.00"));
	}

	@Test
	void shouldNotFlagGrowthOfExactlyThirtyPercent() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "130.00", "100", "100", "100")));

		assertThat(result).isEmpty();
	}

	@Test
	void shouldFlagGrowthJustAboveThirtyPercentAndShowItRoundedDown() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "130.01", "100", "100", "100")));

		assertThat(result).contains(anomaly(1L, "Rozrywka", 30, "130.01", "100.00"));
	}

	@Test
	void shouldCompareWithAverageOfThreeMonthsNotWithLastMonth() {
		// Last month (300) equals the current amount, but the average is 200.
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "300", "100", "200", "300")));

		assertThat(result).contains(anomaly(1L, "Rozrywka", 50, "300.00", "200.00"));
	}

	@Test
	void shouldSkipCategoryWithAZeroMonthInTheBaseline() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "1000", "100", "0", "100")));

		assertThat(result).isEmpty();
	}

	@Test
	void shouldSkipCategoryWithoutAnyBaselineExpenses() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Nowa kategoria", "500", "0", "0", "0")));

		assertThat(result).isEmpty();
	}

	@Test
	void shouldRoundIncreasePercentHalfUp() {
		// (142.50 * 3 - 300) * 100 / 300 = 42.5
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "142.50", "100", "100", "100")));

		assertThat(result).contains(anomaly(1L, "Rozrywka", 43, "142.50", "100.00"));
	}

	@Test
	void shouldRoundAverageToTwoDecimalPlaces() {
		// Total 301.00 / 3 = 100.3333...; (200 * 3 - 301) * 100 / 301 = 99.33
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "200", "100", "100", "101")));

		assertThat(result).contains(anomaly(1L, "Rozrywka", 99, "200.00", "100.33"));
	}

	@Test
	void shouldChooseTheHighestPercentageAmongAnomalies() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Jedzenie", "140", "100", "100", "100"),
				history(2L, "Rozrywka", "180", "100", "100", "100"),
				history(3L, "Transport", "100", "100", "100", "100")));

		assertThat(result).contains(anomaly(2L, "Rozrywka", 80, "180.00", "100.00"));
	}

	@Test
	void shouldBreakPercentageTieWithTheHigherCurrentAmount() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Jedzenie", "150", "100", "100", "100"),
				history(2L, "Rozrywka", "300", "200", "200", "200")));

		assertThat(result).contains(anomaly(2L, "Rozrywka", 50, "300.00", "200.00"));
	}

	@Test
	void shouldBreakAmountTieWithCategoryNameBeforeId() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Rozrywka", "150", "100", "100", "100"),
				history(2L, "Jedzenie", "150", "100", "100", "100")));

		assertThat(result).contains(anomaly(2L, "Jedzenie", 50, "150.00", "100.00"));
	}

	@Test
	void shouldBreakNameTieWithTheLowerId() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(7L, "Zakupy", "150", "100", "100", "100"),
				history(3L, "Zakupy", "150", "100", "100", "100")));

		assertThat(result).contains(anomaly(3L, "Zakupy", 50, "150.00", "100.00"));
	}

	@Test
	void shouldReturnEmptyForEmptyInput() {
		assertThat(SpendingAnomalyDetector.findStrongest(List.of())).isEmpty();
	}

	@Test
	void shouldReturnEmptyWhenNoCategoryExceedsTheThreshold() {
		Optional<SpendingAnomaly> result = SpendingAnomalyDetector.findStrongest(List.of(
				history(1L, "Spadek", "50", "100", "100", "100"),
				history(2L, "Mały wzrost", "120", "100", "100", "100")));

		assertThat(result).isEmpty();
	}

	@Test
	void shouldRejectHistoryWithWrongNumberOfBaselineMonths() {
		List<CategorySpendingHistory> histories = List.of(history(1L, "Rozrywka", "142", "100", "100"));

		assertThatIllegalArgumentException()
				.isThrownBy(() -> SpendingAnomalyDetector.findStrongest(histories))
				.withMessage("Expected 3 baseline months");
	}

	private static CategorySpendingHistory history(Long id, String name, String current, String... previous) {
		return new CategorySpendingHistory(
				id, name, new BigDecimal(current), Arrays.stream(previous).map(BigDecimal::new).toList());
	}

	private static SpendingAnomaly anomaly(Long id, String name, int percent, String current, String average) {
		return new SpendingAnomaly(id, name, percent, new BigDecimal(current), new BigDecimal(average));
	}

}
