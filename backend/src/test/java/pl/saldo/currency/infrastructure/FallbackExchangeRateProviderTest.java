package pl.saldo.currency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;

class FallbackExchangeRateProviderTest {

	private static final LocalDate PUBLICATION_DATE = LocalDate.of(2026, 11, 17);
	private static final LocalDate OLDER_PUBLICATION_DATE = LocalDate.of(2025, 3, 3);
	private static final LocalDate REQUESTED_DATE = LocalDate.of(2026, 11, 20);
	private static final BigDecimal EUR_RATE = new BigDecimal("4.4032");
	private static final BigDecimal NEWER_EUR_RATE = new BigDecimal("4.4100");
	private static final BigDecimal USD_RATE = new BigDecimal("3.8000");

	private FallbackExchangeRateProvider provider;

	@BeforeEach
	void setUp() {
		provider = new FallbackExchangeRateProvider();
	}

	@Test
	void shouldReturnRememberedQuoteAsFallbackWithOriginalPublicationDate() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, PUBLICATION_DATE));

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, REQUESTED_DATE);

		assertThat(quote.rate()).isEqualTo(EUR_RATE);
		assertThat(quote.effectiveDate()).isEqualTo(PUBLICATION_DATE);
		assertThat(quote.source()).isEqualTo(RateSource.FALLBACK);
	}

	@Test
	void shouldReturnRememberedRateRegardlessOfRequestedDate() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, PUBLICATION_DATE));

		assertThat(provider.getRate(SupportedCurrency.EUR, PUBLICATION_DATE)).isEqualTo(EUR_RATE);
		assertThat(provider.getRate(SupportedCurrency.EUR, OLDER_PUBLICATION_DATE)).isEqualTo(EUR_RATE);
	}

	@Test
	void shouldReturnQuoteWithNewestPublicationDate() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, OLDER_PUBLICATION_DATE));
		provider.remember(SupportedCurrency.EUR, nbpQuote(NEWER_EUR_RATE, PUBLICATION_DATE));

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, REQUESTED_DATE);

		assertThat(quote.rate()).isEqualTo(NEWER_EUR_RATE);
		assertThat(quote.effectiveDate()).isEqualTo(PUBLICATION_DATE);
	}

	@Test
	void shouldKeepNewerQuoteWhenOlderOneIsRemembered() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(NEWER_EUR_RATE, PUBLICATION_DATE));
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, OLDER_PUBLICATION_DATE));

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, REQUESTED_DATE);

		assertThat(quote.rate()).isEqualTo(NEWER_EUR_RATE);
		assertThat(quote.effectiveDate()).isEqualTo(PUBLICATION_DATE);
	}

	@Test
	void shouldKeepQuotesPerCurrency() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, PUBLICATION_DATE));
		provider.remember(SupportedCurrency.USD, nbpQuote(USD_RATE, PUBLICATION_DATE));

		assertThat(provider.getRate(SupportedCurrency.EUR, REQUESTED_DATE)).isEqualTo(EUR_RATE);
		assertThat(provider.getRate(SupportedCurrency.USD, REQUESTED_DATE)).isEqualTo(USD_RATE);
	}

	@Test
	void shouldThrowWhenNothingRememberedForCurrency() {
		provider.remember(SupportedCurrency.EUR, nbpQuote(EUR_RATE, PUBLICATION_DATE));

		assertThatThrownBy(() -> provider.getQuote(SupportedCurrency.USD, REQUESTED_DATE))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasMessageContaining("USD");
	}

	@Test
	void shouldRejectNullQuote() {
		assertThatThrownBy(() -> provider.remember(SupportedCurrency.EUR, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void shouldRejectNullCurrency() {
		assertThatThrownBy(() -> provider.remember(null, nbpQuote(EUR_RATE, PUBLICATION_DATE)))
				.isInstanceOf(NullPointerException.class);
	}

	private static ExchangeRateQuote nbpQuote(BigDecimal rate, LocalDate publicationDate) {
		return new ExchangeRateQuote(rate, publicationDate, RateSource.NBP);
	}

}
