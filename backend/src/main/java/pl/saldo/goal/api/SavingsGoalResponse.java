package pl.saldo.goal.api;

import java.math.BigDecimal;
import java.time.LocalDate;

import pl.saldo.goal.domain.GoalStatus;
import pl.saldo.goal.domain.MonthlyContributionCalculator;
import pl.saldo.goal.domain.SavingsGoalEntity;

public record SavingsGoalResponse(
		Long id,
		String name,
		BigDecimal targetAmount,
		BigDecimal currentAmount,
		LocalDate targetDate,
		GoalStatus status,
		int monthsRemaining,
		BigDecimal monthlyContribution) {

	// monthsRemaining is never negative in the response; the calculator still sees the raw (possibly negative) value.
	public static SavingsGoalResponse fromEntity(SavingsGoalEntity goal, LocalDate today) {
		long months = MonthlyContributionCalculator.monthsRemaining(today, goal.getTargetDate());
		return new SavingsGoalResponse(
				goal.getId(),
				goal.getName(),
				goal.getTargetAmount(),
				goal.getCurrentAmount(),
				goal.getTargetDate(),
				goal.status(),
				Math.toIntExact(Math.max(0L, months)),
				MonthlyContributionCalculator.monthlyContribution(
						goal.getTargetAmount(), goal.getCurrentAmount(), months));
	}

}
