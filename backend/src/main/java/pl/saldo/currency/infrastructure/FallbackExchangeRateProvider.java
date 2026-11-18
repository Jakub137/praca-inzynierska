package pl.saldo.currency.infrastructure;

import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;

public class FallbackExchangeRateProvider implements ExchangeRateProvider {

	private final Map<SupportedCurrency, ExchangeRateQuote> lastKnownQuotes = new ConcurrentHashMap<>();

	public void remember(SupportedCurrency currency, ExchangeRateQuote quote) {
		Objects.requireNonNull(currency, "currency must not be null");
		Objects.requireNonNull(quote, "quote must not be null");
		// A lookup for an old transaction must not replace a quote published more recently.
		lastKnownQuotes.merge(currency, quote, FallbackExchangeRateProvider::newer);
	}

	@Override
	public ExchangeRateQuote fetchQuote(SupportedCurrency currency, LocalDate date) {
		// The requested date is ignored on purpose: only the newest known quote per currency is kept.
		ExchangeRateQuote known = lastKnownQuotes.get(currency);
		if (known == null) {
			throw new ExchangeRateUnavailableException("No last known rate for " + currency);
		}
		return new ExchangeRateQuote(known.rate(), known.effectiveDate(), RateSource.FALLBACK);
	}

	private static ExchangeRateQuote newer(ExchangeRateQuote current, ExchangeRateQuote candidate) {
		return candidate.effectiveDate().isBefore(current.effectiveDate()) ? current : candidate;
	}

}
