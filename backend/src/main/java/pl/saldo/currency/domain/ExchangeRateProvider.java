package pl.saldo.currency.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public interface ExchangeRateProvider {

	/**
	 * Returns how many PLN one unit of {@code currency} costs on {@code date}.
	 * PLN is the base currency, so it always yields {@link BigDecimal#ONE} without any external call.
	 * This is the only method callers outside implementations may use.
	 */
	default BigDecimal getRate(SupportedCurrency currency, LocalDate date) {
		Objects.requireNonNull(currency, "currency must not be null");
		Objects.requireNonNull(date, "date must not be null");
		if (currency == SupportedCurrency.PLN) {
			return BigDecimal.ONE;
		}
		return fetchRate(currency, date);
	}

	/**
	 * Obtains the rate of a non-PLN currency from the underlying source.
	 * Called only by {@link #getRate(SupportedCurrency, LocalDate)}; code outside implementations must call
	 * {@code getRate} instead, otherwise the PLN shortcut and the null checks are bypassed.
	 */
	BigDecimal fetchRate(SupportedCurrency currency, LocalDate date);

}
