package pl.saldo.currency.infrastructure;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;

public class ResilientExchangeRateProvider implements ExchangeRateProvider {

	private static final Logger log = LoggerFactory.getLogger(ResilientExchangeRateProvider.class);

	private final ExchangeRateProvider primary;
	private final FallbackExchangeRateProvider fallback;

	public ResilientExchangeRateProvider(ExchangeRateProvider primary, FallbackExchangeRateProvider fallback) {
		this.primary = primary;
		this.fallback = fallback;
	}

	@Override
	public ExchangeRateQuote fetchQuote(SupportedCurrency currency, LocalDate date) {
		try {
			ExchangeRateQuote quote = primary.fetchQuote(currency, date);
			fallback.remember(currency, quote);
			return quote;
		} catch (ExchangeRateUnavailableException e) {
			// Only the domain exception triggers the fallback; programming errors must surface.
			log.warn("Exchange rate source unavailable, activating fallback for {} on {}: {}",
					currency, date, describeReason(e));
			return fallback.fetchQuote(currency, date);
		}
	}

	private static String describeReason(ExchangeRateUnavailableException e) {
		Throwable reason = e.getCause() != null ? e.getCause() : e;
		return reason.toString();
	}

}
