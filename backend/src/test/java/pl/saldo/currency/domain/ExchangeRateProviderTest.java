package pl.saldo.currency.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExchangeRateProviderTest {

	private static final LocalDate DATE = LocalDate.of(2026, 1, 15);
	private static final BigDecimal FETCHED_RATE = new BigDecimal("4.2345");

	private CountingProvider provider;

	@BeforeEach
	void setUp() {
		provider = new CountingProvider(FETCHED_RATE);
	}

	@Test
	void shouldReturnOneForPlnWithoutFetching() {
		BigDecimal rate = provider.getRate(SupportedCurrency.PLN, DATE);

		assertThat(rate).isEqualTo(BigDecimal.ONE);
		assertThat(provider.fetchCalls).isZero();
	}

	@Test
	void shouldDelegateNonPlnCurrencyToFetchRate() {
		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, DATE);

		assertThat(rate).isEqualTo(FETCHED_RATE);
		assertThat(provider.fetchCalls).isEqualTo(1);
		assertThat(provider.lastCurrency).isEqualTo(SupportedCurrency.EUR);
		assertThat(provider.lastDate).isEqualTo(DATE);
	}

	@Test
	void shouldFetchEveryCurrencyExceptPln() {
		for (SupportedCurrency currency : SupportedCurrency.values()) {
			provider.getRate(currency, DATE);
		}

		assertThat(provider.fetchCalls).isEqualTo(SupportedCurrency.values().length - 1);
	}

	@Test
	void shouldRejectNullCurrency() {
		assertThatThrownBy(() -> provider.getRate(null, DATE)).isInstanceOf(NullPointerException.class);

		assertThat(provider.fetchCalls).isZero();
	}

	@Test
	void shouldRejectNullDate() {
		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.USD, null)).isInstanceOf(NullPointerException.class);

		assertThat(provider.fetchCalls).isZero();
	}

	private static final class CountingProvider implements ExchangeRateProvider {

		private final BigDecimal rate;
		private int fetchCalls;
		private SupportedCurrency lastCurrency;
		private LocalDate lastDate;

		private CountingProvider(BigDecimal rate) {
			this.rate = rate;
		}

		@Override
		public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
			fetchCalls++;
			lastCurrency = currency;
			lastDate = date;
			return rate;
		}

	}

}
