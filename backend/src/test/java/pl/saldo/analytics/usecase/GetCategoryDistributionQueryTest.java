package pl.saldo.analytics.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.time.LocalDate;
import java.time.YearMonth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.shared.error.ApiFieldError;

class GetCategoryDistributionQueryTest {

	private static final YearMonth CURRENT_MONTH = YearMonth.of(2026, 11);

	@Test
	void shouldDefaultToWholeCurrentMonthWhenBothDatesAreMissing() {
		assertThat(new GetCategoryDistributionQuery(null, null).resolveRange(CURRENT_MONTH))
				.isEqualTo(range("2026-11-01", "2026-11-30"));
	}

	@Test
	void shouldEndDefaultRangeOnLeapDay() {
		assertThat(new GetCategoryDistributionQuery(null, null).resolveRange(YearMonth.of(2028, 2)))
				.isEqualTo(range("2028-02-01", "2028-02-29"));
	}

	@ParameterizedTest
	@CsvSource({
			"2026-01-01, 2026-06-30",
			"2026-11-05, 2026-11-05",
			"1900-01-01, 2100-12-31"
	})
	void shouldAcceptInclusiveRange(String dateFrom, String dateTo) {
		assertThat(new GetCategoryDistributionQuery(dateFrom, dateTo).resolveRange(CURRENT_MONTH))
				.isEqualTo(range(dateFrom, dateTo));
	}

	// In CsvSource an empty column means null, and '' means an empty text.
	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"2026-01-01 |                  | dateTo   | Podaj obie daty albo nie podawaj żadnej",
			"           | 2026-01-31       | dateFrom | Podaj obie daty albo nie podawaj żadnej",
			"abc        | 2026-01-31       | dateFrom | Data musi być poprawną datą w formacie RRRR-MM-DD",
			"''         | 2026-01-31       | dateFrom | Data musi być poprawną datą w formacie RRRR-MM-DD",
			"2026-02-30 | 2026-03-01       | dateFrom | Data musi być poprawną datą w formacie RRRR-MM-DD",
			"2026-01-01 | 31.01.2026       | dateTo   | Data musi być poprawną datą w formacie RRRR-MM-DD",
			"1899-12-31 | 2026-01-31       | dateFrom | Data musi mieścić się w przedziale od 1900-01-01 do 2100-12-31",
			"2026-01-01 | 2101-01-01       | dateTo   | Data musi mieścić się w przedziale od 1900-01-01 do 2100-12-31",
			"2026-01-01 | +999999999-12-31 | dateTo   | Data musi mieścić się w przedziale od 1900-01-01 do 2100-12-31",
			"2026-02-01 | 2026-01-31       | dateFrom | Data początkowa nie może być późniejsza niż data końcowa"
	})
	void shouldRejectInvalidDates(String dateFrom, String dateTo, String field, String message) {
		assertThatExceptionOfType(InvalidAnalyticsQueryException.class)
				.isThrownBy(() -> new GetCategoryDistributionQuery(dateFrom, dateTo).resolveRange(CURRENT_MONTH))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError(field, message)));
	}

	@Test
	void shouldReportBothInvalidDatesAtOnce() {
		assertThatExceptionOfType(InvalidAnalyticsQueryException.class)
				.isThrownBy(() -> new GetCategoryDistributionQuery("abc", "1800-01-01").resolveRange(CURRENT_MONTH))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.extracting(ApiFieldError::field)
						.containsExactly("dateFrom", "dateTo"));
	}

	private static GetCategoryDistributionQuery.DateRange range(String dateFrom, String dateTo) {
		return new GetCategoryDistributionQuery.DateRange(LocalDate.parse(dateFrom), LocalDate.parse(dateTo));
	}

}
