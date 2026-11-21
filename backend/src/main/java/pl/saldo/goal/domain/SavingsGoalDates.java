package pl.saldo.goal.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.error.ApiFieldError;

public final class SavingsGoalDates {

	private static final LocalDate MAX_TARGET_DATE = LocalDate.of(2100, 12, 31);

	private static final String TARGET_DATE_FIELD = "targetDate";

	private SavingsGoalDates() {
	}

	// The calendar day is taken in the business zone, not in UTC and not in the JVM zone.
	public static LocalDate today(Clock clock) {
		return LocalDate.now(clock.withZone(BusinessTime.ZONE));
	}

	// Not @Future: that annotation uses the default clock, which breaks tests with a fixed Clock and the midnight edge.
	// The upper bound (same last year as budget limits) keeps the date inside the PostgreSQL DATE range
	// and the month count inside an int.
	public static void requireValidTargetDate(LocalDate today, LocalDate targetDate) {
		if (!targetDate.isAfter(today)) {
			throw invalid("Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.");
		}
		if (targetDate.isAfter(MAX_TARGET_DATE)) {
			throw invalid("Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.");
		}
	}

	private static InvalidSavingsGoalException invalid(String message) {
		return new InvalidSavingsGoalException(List.of(new ApiFieldError(TARGET_DATE_FIELD, message)));
	}

}
