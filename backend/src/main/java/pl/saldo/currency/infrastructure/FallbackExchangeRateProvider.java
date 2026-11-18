package pl.saldo.currency.infrastructure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;

public class FallbackExchangeRateProvider implements ExchangeRateProvider {

	private final Map<SupportedCurrency, DatedRate> lastKnownRates = new ConcurrentHashMap<>();

	public void remember(SupportedCurrency currency, LocalDate date, BigDecimal rate) {
		Objects.requireNonNull(currency, "currency must not be null");
		Objects.requireNonNull(date, "date must not be null");
		Objects.requireNonNull(rate, "rate must not be null");
		// A lookup for an old transaction must not replace a rate of a more recent date.
		lastKnownRates.merge(currency, new DatedRate(date, rate), FallbackExchangeRateProvider::newer);
	}

	@Override
	public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
		// The requested date is ignored on purpose: only the newest known rate per currency is kept.
		DatedRate known = lastKnownRates.get(currency);
		if (known == null) {
			throw new ExchangeRateUnavailableException("No last known rate for " + currency);
		}
		return known.rate();
	}

	private static DatedRate newer(DatedRate current, DatedRate candidate) {
		return candidate.date().isBefore(current.date()) ? current : candidate;
	}

	private record DatedRate(LocalDate date, BigDecimal rate) {
	}

}
