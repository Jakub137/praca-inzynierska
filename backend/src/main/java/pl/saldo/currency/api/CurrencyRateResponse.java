package pl.saldo.currency.api;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;

public record CurrencyRateResponse(
		SupportedCurrency currency,
		BigDecimal rate,
		LocalDate effectiveDate,
		RateSource source) {

	private static final int RATE_SCALE = 4;

	public static CurrencyRateResponse from(SupportedCurrency currency, ExchangeRateQuote quote) {
		return new CurrencyRateResponse(
				currency,
				quote.rate().setScale(RATE_SCALE, RoundingMode.HALF_UP),
				quote.effectiveDate(),
				quote.source());
	}

}
