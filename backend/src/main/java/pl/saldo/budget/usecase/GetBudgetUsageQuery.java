package pl.saldo.budget.usecase;

import java.time.Clock;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import pl.saldo.budget.domain.InvalidBudgetUsageQueryException;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.error.ApiFieldError;

public record GetBudgetUsageQuery(Integer month, Integer year) {

	private static final String MONTH_FIELD = "month";
	private static final String YEAR_FIELD = "year";

	// No parameters means the current month in the business zone (not in UTC); one parameter alone is an error.
	public YearMonth resolvePeriod(Clock clock) {
		List<ApiFieldError> errors = new ArrayList<>();
		validate(errors);
		if (!errors.isEmpty()) {
			throw new InvalidBudgetUsageQueryException(errors);
		}
		if (month == null) {
			return YearMonth.now(clock.withZone(BusinessTime.ZONE));
		}
		return YearMonth.of(year, month);
	}

	private void validate(List<ApiFieldError> errors) {
		if (month == null && year == null) {
			return;
		}
		validateMonth(errors);
		validateYear(errors);
	}

	private void validateMonth(List<ApiFieldError> errors) {
		if (month == null) {
			errors.add(new ApiFieldError(MONTH_FIELD, "Miesiąc jest wymagany, gdy podano rok"));
			return;
		}
		if (month < SetBudgetLimitCommand.MIN_MONTH || month > SetBudgetLimitCommand.MAX_MONTH) {
			errors.add(new ApiFieldError(MONTH_FIELD, "Miesiąc musi być liczbą od "
					+ SetBudgetLimitCommand.MIN_MONTH + " do " + SetBudgetLimitCommand.MAX_MONTH));
		}
	}

	private void validateYear(List<ApiFieldError> errors) {
		if (year == null) {
			errors.add(new ApiFieldError(YEAR_FIELD, "Rok jest wymagany, gdy podano miesiąc"));
			return;
		}
		if (year < SetBudgetLimitCommand.MIN_YEAR || year > SetBudgetLimitCommand.MAX_YEAR) {
			errors.add(new ApiFieldError(YEAR_FIELD, "Rok musi być liczbą od "
					+ SetBudgetLimitCommand.MIN_YEAR + " do " + SetBudgetLimitCommand.MAX_YEAR));
		}
	}

}
