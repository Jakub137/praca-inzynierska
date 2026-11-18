package pl.saldo.currency.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class ExchangeRateQuoteTest {

	private static final BigDecimal RATE = new BigDecimal("4.3100");
	private static final LocalDate DATE = LocalDate.of(2026, 11, 17);

	@Test
	void shouldKeepAllComponents() {
		ExchangeRateQuote quote = new ExchangeRateQuote(RATE, DATE, RateSource.NBP);

		assertThat(quote.rate()).isEqualByComparingTo(RATE);
		assertThat(quote.effectiveDate()).isEqualTo(DATE);
		assertThat(quote.source()).isEqualTo(RateSource.NBP);
	}

	@Test
	void shouldRejectNullRate() {
		assertThatThrownBy(() -> new ExchangeRateQuote(null, DATE, RateSource.NBP))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void shouldRejectNullEffectiveDate() {
		assertThatThrownBy(() -> new ExchangeRateQuote(RATE, null, RateSource.NBP))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void shouldRejectNullSource() {
		assertThatThrownBy(() -> new ExchangeRateQuote(RATE, DATE, null))
				.isInstanceOf(NullPointerException.class);
	}

}
