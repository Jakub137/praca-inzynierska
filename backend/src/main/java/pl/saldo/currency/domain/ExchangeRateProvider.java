package pl.saldo.currency.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public interface ExchangeRateProvider {

	/**
	 * Returns how many PLN one unit of {@code currency} costs, with the NBP publication date of that rate and
	 * its source. PLN is the base currency, so it always yields rate one for the requested date without any
	 * external call and is never a fallback. This and {@link #getRate(SupportedCurrency, LocalDate)} are the only
	 * methods callers outside implementations may use.
	 */
	default ExchangeRateQuote getQuote(SupportedCurrency currency, LocalDate date) {
		Objects.requireNonNull(currency, "currency must not be null");
		Objects.requireNonNull(date, "date must not be null");
		if (currency == SupportedCurrency.PLN) {
			return new ExchangeRateQuote(BigDecimal.ONE, date, RateSource.NBP);
		}
		return fetchQuote(currency, date);
	}

	/**
	 * Returns only the rate of {@link #getQuote(SupportedCurrency, LocalDate)}.
	 */
	default BigDecimal getRate(SupportedCurrency currency, LocalDate date) {
		return getQuote(currency, date).rate();
	}

	/**
	 * Obtains the quote of a non-PLN currency from the underlying source.
	 * Called only by {@link #getQuote(SupportedCurrency, LocalDate)}; code outside implementations must call
	 * {@code getQuote} or {@code getRate} instead, otherwise the PLN shortcut and the null checks are bypassed.
	 */
	ExchangeRateQuote fetchQuote(SupportedCurrency currency, LocalDate date);

}
