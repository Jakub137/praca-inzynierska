package pl.saldo.currency.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * A rate together with the date NBP published it and the source it came from.
 * The effective date is the publication date, not the date the caller asked for.
 */
public record ExchangeRateQuote(BigDecimal rate, LocalDate effectiveDate, RateSource source) {

	public ExchangeRateQuote {
		Objects.requireNonNull(rate, "rate must not be null");
		Objects.requireNonNull(effectiveDate, "effectiveDate must not be null");
		Objects.requireNonNull(source, "source must not be null");
	}

}
