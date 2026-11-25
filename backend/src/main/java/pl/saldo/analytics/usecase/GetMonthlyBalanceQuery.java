package pl.saldo.analytics.usecase;

import java.util.List;

import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.shared.error.ApiFieldError;

// months arrives as text: with an Integer parameter a non-numeric value would be rejected by Spring before this
// check, and the response would have no fieldErrors.
public record GetMonthlyBalanceQuery(String months) {

	private static final String MONTHS_FIELD = "months";
	private static final int DEFAULT_MONTHS = 6;
	private static final int MIN_MONTHS = 1;
	private static final int MAX_MONTHS = 12;

	// A missing parameter means the default; a present but empty value is invalid.
	public int resolveMonths() {
		if (months == null) {
			return DEFAULT_MONTHS;
		}
		int value = parse(months);
		if (value < MIN_MONTHS || value > MAX_MONTHS) {
			throw invalidMonths();
		}
		return value;
	}

	private static int parse(String text) {
		try {
			return Integer.parseInt(text);
		}
		catch (NumberFormatException ex) {
			throw invalidMonths();
		}
	}

	private static InvalidAnalyticsQueryException invalidMonths() {
		return new InvalidAnalyticsQueryException(List.of(new ApiFieldError(MONTHS_FIELD,
				"Liczba miesięcy musi być liczbą całkowitą od " + MIN_MONTHS + " do " + MAX_MONTHS)));
	}

}
