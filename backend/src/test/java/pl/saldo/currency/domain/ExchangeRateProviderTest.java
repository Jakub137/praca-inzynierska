package pl.saldo.currency.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExchangeRateProviderTest {

	private static final LocalDate DATE = LocalDate.of(2026, 1, 15);
	private static final LocalDate PUBLICATION_DATE = LocalDate.of(2026, 1, 14);
	private static final BigDecimal FETCHED_RATE = new BigDecimal("4.2345");

	private ExchangeRateQuote fetchedQuote;
	private CountingProvider provider;

	@BeforeEach
	void setUp() {
		fetchedQuote = new ExchangeRateQuote(FETCHED_RATE, PUBLICATION_DATE, RateSource.NBP);
		provider = new CountingProvider(fetchedQuote);
	}

	@Test
	void shouldReturnOneForPlnWithoutFetching() {
		BigDecimal rate = provider.getRate(SupportedCurrency.PLN, DATE);

		assertThat(rate).isEqualTo(BigDecimal.ONE);
		assertThat(provider.fetchCalls).isZero();
	}

	@Test
	void shouldReturnPlnQuoteForRequestedDateAsNbpSourceWithoutFetching() {
		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.PLN, DATE);

		assertThat(quote.rate()).isEqualByComparingTo(BigDecimal.ONE);
		assertThat(quote.effectiveDate()).isEqualTo(DATE);
		assertThat(quote.source()).isEqualTo(RateSource.NBP);
		assertThat(provider.fetchCalls).isZero();
	}

	@Test
	void shouldDelegateNonPlnCurrencyToFetchQuote() {
		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, DATE);

		assertThat(quote).isSameAs(fetchedQuote);
		assertThat(provider.fetchCalls).isEqualTo(1);
		assertThat(provider.lastCurrency).isEqualTo(SupportedCurrency.EUR);
		assertThat(provider.lastDate).isEqualTo(DATE);
	}

	@Test
	void shouldReturnRateOfFetchedQuote() {
		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, DATE);

		assertThat(rate).isEqualTo(FETCHED_RATE);
		assertThat(provider.fetchCalls).isEqualTo(1);
	}

	@Test
	void shouldFetchEveryCurrencyExceptPln() {
		for (SupportedCurrency currency : SupportedCurrency.values()) {
			provider.getQuote(currency, DATE);
		}

		assertThat(provider.fetchCalls).isEqualTo(SupportedCurrency.values().length - 1);
	}

	@Test
	void shouldRejectNullCurrency() {
		assertThatThrownBy(() -> provider.getRate(null, DATE)).isInstanceOf(NullPointerException.class);
		assertThatThrownBy(() -> provider.getQuote(null, DATE)).isInstanceOf(NullPointerException.class);

		assertThat(provider.fetchCalls).isZero();
	}

	@Test
	void shouldRejectNullDate() {
		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.USD, null)).isInstanceOf(NullPointerException.class);
		assertThatThrownBy(() -> provider.getQuote(SupportedCurrency.USD, null)).isInstanceOf(NullPointerException.class);

		assertThat(provider.fetchCalls).isZero();
	}

	private static final class CountingProvider implements ExchangeRateProvider {

		private final ExchangeRateQuote quote;
		private int fetchCalls;
		private SupportedCurrency lastCurrency;
		private LocalDate lastDate;

		private CountingProvider(ExchangeRateQuote quote) {
			this.quote = quote;
		}

		@Override
		public ExchangeRateQuote fetchQuote(SupportedCurrency currency, LocalDate date) {
			fetchCalls++;
			lastCurrency = currency;
			lastDate = date;
			return quote;
		}

	}

}
