package pl.saldo.currency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;

class FallbackExchangeRateProviderTest {

	private static final LocalDate DATE = LocalDate.of(2026, 11, 17);
	private static final LocalDate OTHER_DATE = LocalDate.of(2025, 3, 3);
	private static final BigDecimal EUR_RATE = new BigDecimal("4.4032");
	private static final BigDecimal NEWER_EUR_RATE = new BigDecimal("4.4100");
	private static final BigDecimal USD_RATE = new BigDecimal("3.8000");

	private FallbackExchangeRateProvider provider;

	@BeforeEach
	void setUp() {
		provider = new FallbackExchangeRateProvider();
	}

	@Test
	void shouldReturnRememberedRateRegardlessOfRequestedDate() {
		provider.remember(SupportedCurrency.EUR, DATE, EUR_RATE);

		assertThat(provider.getRate(SupportedCurrency.EUR, DATE)).isEqualTo(EUR_RATE);
		assertThat(provider.getRate(SupportedCurrency.EUR, OTHER_DATE)).isEqualTo(EUR_RATE);
	}

	@Test
	void shouldReturnNewestRememberedRate() {
		provider.remember(SupportedCurrency.EUR, OTHER_DATE, EUR_RATE);
		provider.remember(SupportedCurrency.EUR, DATE, NEWER_EUR_RATE);

		assertThat(provider.getRate(SupportedCurrency.EUR, DATE)).isEqualTo(NEWER_EUR_RATE);
	}

	@Test
	void shouldKeepNewerRateWhenOlderDateIsRemembered() {
		provider.remember(SupportedCurrency.EUR, DATE, NEWER_EUR_RATE);
		provider.remember(SupportedCurrency.EUR, OTHER_DATE, EUR_RATE);

		assertThat(provider.getRate(SupportedCurrency.EUR, DATE)).isEqualTo(NEWER_EUR_RATE);
	}

	@Test
	void shouldKeepRatesPerCurrency() {
		provider.remember(SupportedCurrency.EUR, DATE, EUR_RATE);
		provider.remember(SupportedCurrency.USD, DATE, USD_RATE);

		assertThat(provider.getRate(SupportedCurrency.EUR, DATE)).isEqualTo(EUR_RATE);
		assertThat(provider.getRate(SupportedCurrency.USD, DATE)).isEqualTo(USD_RATE);
	}

	@Test
	void shouldThrowWhenNothingRememberedForCurrency() {
		provider.remember(SupportedCurrency.EUR, DATE, EUR_RATE);

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.USD, DATE))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasMessageContaining("USD");
	}

	@Test
	void shouldRejectNullRate() {
		assertThatThrownBy(() -> provider.remember(SupportedCurrency.EUR, DATE, null))
				.isInstanceOf(NullPointerException.class);
	}

}
