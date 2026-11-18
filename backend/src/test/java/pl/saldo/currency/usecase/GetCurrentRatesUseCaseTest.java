package pl.saldo.currency.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.currency.api.CurrencyRateResponse;
import pl.saldo.currency.api.CurrencyRatesResponse;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;

@ExtendWith(MockitoExtension.class)
class GetCurrentRatesUseCaseTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-18T10:00:00Z"), ZoneOffset.UTC);
	private static final LocalDate TODAY = LocalDate.of(2026, 11, 18);
	private static final LocalDate PUBLICATION_DATE = LocalDate.of(2026, 11, 17);
	private static final LocalDate OLDER_PUBLICATION_DATE = LocalDate.of(2026, 11, 13);

	@Mock
	private ExchangeRateProvider exchangeRateProvider;

	private GetCurrentRatesUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetCurrentRatesUseCase(exchangeRateProvider, CLOCK);
	}

	// The stubs match only TODAY, so the test also proves the date comes from the injected Clock.
	@Test
	void shouldReturnFourCurrenciesInFixedOrderAllFromNbp() {
		given(exchangeRateProvider.getQuote(SupportedCurrency.EUR, TODAY)).willReturn(nbpQuote("4.3100"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.USD, TODAY)).willReturn(nbpQuote("3.9800"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.GBP, TODAY)).willReturn(nbpQuote("5.0900"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.CHF, TODAY)).willReturn(nbpQuote("4.6300"));

		CurrencyRatesResponse response = useCase.execute();

		assertThat(response.rates()).extracting(CurrencyRateResponse::currency).containsExactly(
				SupportedCurrency.EUR, SupportedCurrency.USD, SupportedCurrency.GBP, SupportedCurrency.CHF);
		assertThat(response.rates()).extracting(CurrencyRateResponse::source).containsOnly(RateSource.NBP);
		assertThat(response.rates()).extracting(CurrencyRateResponse::effectiveDate).containsOnly(PUBLICATION_DATE);
		assertThat(response.rates().get(0).rate()).isEqualByComparingTo("4.3100");
		assertThat(response.rates().get(3).rate()).isEqualByComparingTo("4.6300");
		then(exchangeRateProvider).should(never()).getQuote(eq(SupportedCurrency.PLN), any());
	}

	@Test
	void shouldMarkOnlyFallbackCurrenciesAsFallback() {
		given(exchangeRateProvider.getQuote(SupportedCurrency.EUR, TODAY)).willReturn(nbpQuote("4.3100"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.USD, TODAY)).willReturn(fallbackQuote("3.9800"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.GBP, TODAY)).willReturn(nbpQuote("5.0900"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.CHF, TODAY)).willReturn(fallbackQuote("4.6300"));

		CurrencyRatesResponse response = useCase.execute();

		assertThat(response.rates()).extracting(CurrencyRateResponse::source).containsExactly(
				RateSource.NBP, RateSource.FALLBACK, RateSource.NBP, RateSource.FALLBACK);
		assertThat(response.rates().get(1).effectiveDate()).isEqualTo(OLDER_PUBLICATION_DATE);
		assertThat(response.rates().get(0).effectiveDate()).isEqualTo(PUBLICATION_DATE);
	}

	@Test
	void shouldReturnRatesWithFourDecimalPlaces() {
		given(exchangeRateProvider.getQuote(SupportedCurrency.EUR, TODAY)).willReturn(nbpQuote("4.31"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.USD, TODAY)).willReturn(nbpQuote("3.98"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.GBP, TODAY)).willReturn(nbpQuote("5.09"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.CHF, TODAY)).willReturn(nbpQuote("4.63"));

		CurrencyRatesResponse response = useCase.execute();

		assertThat(response.rates()).extracting(rate -> rate.rate().scale()).containsOnly(4);
		assertThat(response.rates().get(0).rate()).isEqualByComparingTo("4.3100");
	}

	@Test
	void shouldThrowWhenAnyCurrencyIsUnavailable() {
		given(exchangeRateProvider.getQuote(SupportedCurrency.EUR, TODAY)).willReturn(nbpQuote("4.3100"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.USD, TODAY)).willReturn(nbpQuote("3.9800"));
		given(exchangeRateProvider.getQuote(SupportedCurrency.GBP, TODAY))
				.willThrow(new ExchangeRateUnavailableException("No last known rate for GBP"));

		assertThatThrownBy(() -> useCase.execute())
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasMessageContaining("GBP");
	}

	private static ExchangeRateQuote nbpQuote(String rate) {
		return new ExchangeRateQuote(new BigDecimal(rate), PUBLICATION_DATE, RateSource.NBP);
	}

	private static ExchangeRateQuote fallbackQuote(String rate) {
		return new ExchangeRateQuote(new BigDecimal(rate), OLDER_PUBLICATION_DATE, RateSource.FALLBACK);
	}

}
