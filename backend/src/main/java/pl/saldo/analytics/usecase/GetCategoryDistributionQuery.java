package pl.saldo.analytics.usecase;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.shared.error.ApiFieldError;

// Dates arrive as text: with LocalDate parameters a malformed value would be rejected by Spring before this check,
// and the response would have no fieldErrors.
public record GetCategoryDistributionQuery(String dateFrom, String dateTo) {

	private static final String DATE_FROM_FIELD = "dateFrom";
	private static final String DATE_TO_FIELD = "dateTo";
	private static final LocalDate MIN_DATE = LocalDate.of(1900, 1, 1);
	private static final LocalDate MAX_DATE = LocalDate.of(2100, 12, 31);

	// Both ends are inclusive.
	public record DateRange(LocalDate dateFrom, LocalDate dateTo) {

	}

	// No dates means the whole current month. Otherwise both are required and every invalid one is reported at once.
	public DateRange resolveRange(YearMonth currentMonth) {
		if (dateFrom == null && dateTo == null) {
			return new DateRange(currentMonth.atDay(1), currentMonth.atEndOfMonth());
		}
		List<ApiFieldError> errors = new ArrayList<>();
		LocalDate from = resolveDate(DATE_FROM_FIELD, dateFrom, errors);
		LocalDate to = resolveDate(DATE_TO_FIELD, dateTo, errors);
		if (from != null && to != null && from.isAfter(to)) {
			errors.add(new ApiFieldError(DATE_FROM_FIELD, "Data początkowa nie może być późniejsza niż data końcowa"));
		}
		if (!errors.isEmpty()) {
			throw new InvalidAnalyticsQueryException(errors);
		}
		return new DateRange(from, to);
	}

	// Returns null for an invalid value, after adding its error.
	private static LocalDate resolveDate(String field, String text, List<ApiFieldError> errors) {
		if (text == null) {
			errors.add(new ApiFieldError(field, "Podaj obie daty albo nie podawaj żadnej"));
			return null;
		}
		try {
			return requireSupported(field, LocalDate.parse(text), errors);
		}
		catch (DateTimeParseException ex) {
			errors.add(new ApiFieldError(field, "Data musi być poprawną datą w formacie RRRR-MM-DD"));
			return null;
		}
	}

	// The bounds also keep extreme years (accepted by LocalDate.parse) away from date arithmetic and the database.
	private static LocalDate requireSupported(String field, LocalDate date, List<ApiFieldError> errors) {
		if (date.isBefore(MIN_DATE) || date.isAfter(MAX_DATE)) {
			errors.add(new ApiFieldError(field, "Data musi mieścić się w przedziale od " + MIN_DATE + " do " + MAX_DATE));
			return null;
		}
		return date;
	}

}
