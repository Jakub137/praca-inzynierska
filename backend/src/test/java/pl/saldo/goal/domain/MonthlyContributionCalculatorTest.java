package pl.saldo.goal.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class MonthlyContributionCalculatorTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 21);

	@Test
	void shouldCountOnlyFullMonthsToDeadline() {
		assertThat(MonthlyContributionCalculator.monthsRemaining(TODAY, LocalDate.of(2027, 7, 15))).isEqualTo(7);
	}

	@Test
	void shouldCountOneMonthWhenDeadlineIsExactlyOneMonthAway() {
		assertThat(MonthlyContributionCalculator.monthsRemaining(TODAY, LocalDate.of(2026, 12, 21))).isEqualTo(1);
	}

	@Test
	void shouldCountZeroMonthsWhenDeadlineIsLessThanOneMonthAway() {
		assertThat(MonthlyContributionCalculator.monthsRemaining(TODAY, LocalDate.of(2026, 12, 15))).isZero();
	}

	@Test
	void shouldReturnNegativeMonthsWhenDeadlineHasPassed() {
		assertThat(MonthlyContributionCalculator.monthsRemaining(TODAY, LocalDate.of(2026, 9, 1))).isEqualTo(-2);
	}

	@Test
	void shouldRoundContributionUpSoThatInstalmentsReachTheGoal() {
		assertThat(contribution("1000.00", "0.00", 3)).isEqualTo(new BigDecimal("333.34"));
	}

	@Test
	void shouldReturnExactContributionWhenDivisionHasNoRemainder() {
		assertThat(contribution("900.00", "0.00", 3)).isEqualTo(new BigDecimal("300.00"));
	}

	@Test
	void shouldDivideOnlyTheRemainingAmount() {
		assertThat(contribution("6000.00", "4500.00", 8)).isEqualTo(new BigDecimal("187.50"));
	}

	@Test
	void shouldReturnZeroWhenGoalIsReached() {
		assertThat(contribution("1000.00", "1000.00", 5)).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldReturnZeroWhenGoalIsOverpaid() {
		assertThat(contribution("1000.00", "1200.00", 5)).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldReturnWholeRemainderWhenLessThanOneMonthIsLeft() {
		assertThat(contribution("1000.00", "400.00", 0)).isEqualTo(new BigDecimal("600.00"));
	}

	@Test
	void shouldReturnWholeRemainderWhenDeadlineHasPassed() {
		assertThat(contribution("1000.00", "400.00", -2)).isEqualTo(new BigDecimal("600.00"));
	}

	@Test
	void shouldReturnZeroForReachedGoalWithoutFullMonthLeft() {
		assertThat(contribution("1000.00", "1000.00", 0)).isEqualTo(new BigDecimal("0.00"));
	}

	private static BigDecimal contribution(String target, String current, long months) {
		return MonthlyContributionCalculator.monthlyContribution(new BigDecimal(target), new BigDecimal(current), months);
	}

}
