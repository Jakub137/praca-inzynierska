package pl.saldo.budget.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import pl.saldo.budget.domain.InvalidBudgetUsageQueryException;
import pl.saldo.shared.error.ApiFieldError;

class GetBudgetUsageQueryTest {

	// 23:30 UTC on 30 Nov is already 00:30 on 1 Dec in Warsaw.
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-30T23:30:00Z"), ZoneOffset.UTC);

	@Test
	void shouldUseCurrentMonthInWarsawZoneWhenNoParametersAreGiven() {
		YearMonth period = new GetBudgetUsageQuery(null, null).resolvePeriod(CLOCK);

		assertThat(period).isEqualTo(YearMonth.of(2026, 12));
	}

	@Test
	void shouldUseGivenMonthAndYear() {
		YearMonth period = new GetBudgetUsageQuery(10, 2025).resolvePeriod(CLOCK);

		assertThat(period).isEqualTo(YearMonth.of(2025, 10));
	}

	@Test
	void shouldAcceptRangeBoundaries() {
		assertThat(new GetBudgetUsageQuery(1, 2000).resolvePeriod(CLOCK)).isEqualTo(YearMonth.of(2000, 1));
		assertThat(new GetBudgetUsageQuery(12, 2100).resolvePeriod(CLOCK)).isEqualTo(YearMonth.of(2100, 12));
	}

	@Test
	void shouldRejectMonthWithoutYear() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(11, null).resolvePeriod(CLOCK))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("year", "Rok jest wymagany, gdy podano miesiąc")));
	}

	@Test
	void shouldRejectYearWithoutMonth() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(null, 2026).resolvePeriod(CLOCK))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("month", "Miesiąc jest wymagany, gdy podano rok")));
	}

	@Test
	void shouldRejectMonthOutOfRange() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(13, 2026).resolvePeriod(CLOCK))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("month", "Miesiąc musi być liczbą od 1 do 12")));
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(0, 2026).resolvePeriod(CLOCK));
	}

	@Test
	void shouldRejectYearOutOfRange() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(11, 1999).resolvePeriod(CLOCK))
				.satisfies(ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("year", "Rok musi być liczbą od 2000 do 2100")));
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(11, 2101).resolvePeriod(CLOCK));
	}

	@Test
	void shouldReportBothInvalidParametersAtOnce() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> new GetBudgetUsageQuery(13, 1999).resolvePeriod(CLOCK))
				.satisfies(ex -> assertThat(ex.getFieldErrors()).extracting(ApiFieldError::field)
						.containsExactly("month", "year"));
	}

}
