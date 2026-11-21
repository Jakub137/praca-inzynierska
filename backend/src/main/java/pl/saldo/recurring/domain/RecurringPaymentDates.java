package pl.saldo.recurring.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.error.ApiFieldError;

public final class RecurringPaymentDates {

	private static final LocalDate MAX_NEXT_DUE_DATE = LocalDate.of(2100, 12, 31);

	private static final String NEXT_DUE_DATE_FIELD = "nextDueDate";

	private RecurringPaymentDates() {
	}

	// The calendar day is taken in the business zone, not in UTC and not in the JVM zone.
	public static LocalDate today(Clock clock) {
		return LocalDate.now(clock.withZone(BusinessTime.ZONE));
	}

	// Today is allowed (a payment may fall due today), unlike a savings goal deadline. Not @FutureOrPresent:
	// that annotation uses the default clock, which breaks tests with a fixed Clock and the midnight edge.
	// The upper bound (same last year as goals and budget limits) keeps the date inside the PostgreSQL DATE range.
	public static void requireValidNextDueDate(LocalDate today, LocalDate nextDueDate) {
		if (nextDueDate.isBefore(today)) {
			throw invalid("Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.");
		}
		if (nextDueDate.isAfter(MAX_NEXT_DUE_DATE)) {
			throw invalid("Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.");
		}
	}

	private static InvalidRecurringPaymentException invalid(String message) {
		return new InvalidRecurringPaymentException(List.of(new ApiFieldError(NEXT_DUE_DATE_FIELD, message)));
	}

}
