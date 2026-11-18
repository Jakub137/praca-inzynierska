package pl.saldo.currency.usecase;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import pl.saldo.currency.api.CurrencyRateResponse;
import pl.saldo.currency.api.CurrencyRatesResponse;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.SupportedCurrency;

@Service
public class GetCurrentRatesUseCase {

	private static final List<SupportedCurrency> RATE_CURRENCIES = List.of(
			SupportedCurrency.EUR, SupportedCurrency.USD, SupportedCurrency.GBP, SupportedCurrency.CHF);

	private final ExchangeRateProvider exchangeRateProvider;
	private final Clock clock;

	public GetCurrentRatesUseCase(ExchangeRateProvider exchangeRateProvider, Clock clock) {
		this.exchangeRateProvider = exchangeRateProvider;
		this.clock = clock;
	}

	// No @Transactional: every call may block on NBP (up to 5 s) and must not hold a database connection.
	public CurrencyRatesResponse execute() {
		LocalDate today = LocalDate.now(clock);
		List<CurrencyRateResponse> rates = RATE_CURRENCIES.stream()
				.map(currency -> CurrencyRateResponse.from(currency, exchangeRateProvider.getQuote(currency, today)))
				.toList();
		return new CurrencyRatesResponse(rates);
	}

}
