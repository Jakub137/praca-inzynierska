package pl.saldo.currency.infrastructure;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import pl.saldo.currency.domain.ExchangeRateProvider;
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
	public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
		try {
			BigDecimal rate = primary.fetchRate(currency, date);
			fallback.remember(currency, date, rate);
			return rate;
		} catch (ExchangeRateUnavailableException e) {
			// Only the domain exception triggers the fallback; programming errors must surface.
			log.warn("Exchange rate source unavailable, activating fallback for {} on {}: {}",
					currency, date, describeReason(e));
			return fallback.fetchRate(currency, date);
		}
	}

	private static String describeReason(ExchangeRateUnavailableException e) {
		Throwable reason = e.getCause() != null ? e.getCause() : e;
		return reason.toString();
	}

}
