package pl.saldo.analytics.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.shared.error.ApiFieldError;

class GetMonthlyBalanceQueryTest {

	@Test
	void shouldDefaultToSixMonthsWhenParameterIsMissing() {
		assertThat(new GetMonthlyBalanceQuery(null).resolveMonths()).isEqualTo(6);
	}

	@ParameterizedTest
	@ValueSource(strings = { "1", "6", "12" })
	void shouldAcceptValuesFromOneToTwelve(String months) {
		assertThat(new GetMonthlyBalanceQuery(months).resolveMonths()).isEqualTo(Integer.parseInt(months));
	}

	@ParameterizedTest
	@ValueSource(strings = { "0", "13", "-1", "abc", "", "1.5", "99999999999" })
	void shouldRejectValueOutOfRangeOrNotAnInteger(String months) {
		assertThatExceptionOfType(InvalidAnalyticsQueryException.class)
				.isThrownBy(() -> new GetMonthlyBalanceQuery(months).resolveMonths())
				.satisfies(ex -> assertThat(ex.getFieldErrors()).containsExactly(
						new ApiFieldError("months", "Liczba miesięcy musi być liczbą całkowitą od 1 do 12")));
	}

}
