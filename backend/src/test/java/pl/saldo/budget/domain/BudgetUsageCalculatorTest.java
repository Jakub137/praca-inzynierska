package pl.saldo.budget.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class BudgetUsageCalculatorTest {

	private static final BigDecimal LIMIT = new BigDecimal("10000.00");

	@Test
	void shouldBeNormalJustBelowWarningThreshold() {
		BigDecimal spent = new BigDecimal("7999.00");

		assertThat(BudgetUsageCalculator.percentage(spent, LIMIT)).isEqualTo(new BigDecimal("79.99"));
		assertThat(BudgetUsageCalculator.status(spent, LIMIT)).isEqualTo(BudgetStatus.NORMAL);
	}

	@Test
	void shouldWarnExactlyAtEightyPercent() {
		BigDecimal spent = new BigDecimal("8000.00");

		assertThat(BudgetUsageCalculator.percentage(spent, LIMIT)).isEqualTo(new BigDecimal("80.00"));
		assertThat(BudgetUsageCalculator.status(spent, LIMIT)).isEqualTo(BudgetStatus.WARNING);
	}

	@Test
	void shouldStayWarningJustBelowLimit() {
		BigDecimal spent = new BigDecimal("9999.00");

		assertThat(BudgetUsageCalculator.percentage(spent, LIMIT)).isEqualTo(new BigDecimal("99.99"));
		assertThat(BudgetUsageCalculator.status(spent, LIMIT)).isEqualTo(BudgetStatus.WARNING);
	}

	@Test
	void shouldBeExceededExactlyAtLimit() {
		BigDecimal spent = new BigDecimal("10000.00");

		assertThat(BudgetUsageCalculator.percentage(spent, LIMIT)).isEqualTo(new BigDecimal("100.00"));
		assertThat(BudgetUsageCalculator.status(spent, LIMIT)).isEqualTo(BudgetStatus.EXCEEDED);
	}

	@Test
	void shouldDecideStatusFromExactAmountsNotFromRoundedPercentage() {
		BigDecimal almostWarning = new BigDecimal("7999.99");
		BigDecimal almostExceeded = new BigDecimal("9999.99");

		assertThat(BudgetUsageCalculator.percentage(almostWarning, LIMIT)).isEqualTo(new BigDecimal("80.00"));
		assertThat(BudgetUsageCalculator.status(almostWarning, LIMIT)).isEqualTo(BudgetStatus.NORMAL);
		assertThat(BudgetUsageCalculator.percentage(almostExceeded, LIMIT)).isEqualTo(new BigDecimal("100.00"));
		assertThat(BudgetUsageCalculator.status(almostExceeded, LIMIT)).isEqualTo(BudgetStatus.WARNING);
	}

	@Test
	void shouldAllowPercentageAboveOneHundred() {
		BigDecimal limit = new BigDecimal("1000.00");
		BigDecimal spent = new BigDecimal("1842.00");

		assertThat(BudgetUsageCalculator.percentage(spent, limit)).isEqualTo(new BigDecimal("184.20"));
		assertThat(BudgetUsageCalculator.status(spent, limit)).isEqualTo(BudgetStatus.EXCEEDED);
	}

	@Test
	void shouldReturnZeroPercentAndNormalForNoSpending() {
		BigDecimal spent = new BigDecimal("0.00");

		assertThat(BudgetUsageCalculator.percentage(spent, LIMIT)).isEqualTo(new BigDecimal("0.00"));
		assertThat(BudgetUsageCalculator.status(spent, LIMIT)).isEqualTo(BudgetStatus.NORMAL);
	}

	@Test
	void shouldRoundPercentageHalfUpToTwoDecimals() {
		BigDecimal limit = new BigDecimal("3.00");
		BigDecimal spent = new BigDecimal("1.00");

		assertThat(BudgetUsageCalculator.percentage(spent, limit)).isEqualTo(new BigDecimal("33.33"));
		assertThat(BudgetUsageCalculator.percentage(new BigDecimal("2.00"), limit)).isEqualTo(new BigDecimal("66.67"));
	}

	@Test
	void shouldRejectNonPositiveLimit() {
		BigDecimal spent = new BigDecimal("10.00");

		assertThatThrownBy(() -> BudgetUsageCalculator.percentage(spent, BigDecimal.ZERO))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> BudgetUsageCalculator.status(spent, new BigDecimal("-1.00")))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
