package pl.saldo.transaction.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;

@Component
public class PlnConversion {

	private static final int RATE_SCALE = 4;
	private static final int MONEY_SCALE = 2;
	// Largest value of amount_pln DECIMAL(12,2).
	private static final BigDecimal MAX_AMOUNT_PLN = new BigDecimal("9999999999.99");

	private final ExchangeRateProvider exchangeRateProvider;

	public PlnConversion(ExchangeRateProvider exchangeRateProvider) {
		this.exchangeRateProvider = exchangeRateProvider;
	}

	public BigDecimal normalizeAmount(BigDecimal amount) {
		return amount.setScale(MONEY_SCALE);
	}

	// The column holds 4 decimals, so the rate is rounded before the multiplication: the stored rate
	// is then exactly the one used to compute amount_pln. For PLN the provider returns 1 -> 1.0000.
	public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
		return exchangeRateProvider.getRate(currency, date).setScale(RATE_SCALE, RoundingMode.HALF_UP);
	}

	public BigDecimal toPln(BigDecimal amount, BigDecimal exchangeRate) {
		BigDecimal amountPln = amount.multiply(exchangeRate).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		if (amountPln.compareTo(MAX_AMOUNT_PLN) > 0) {
			throw new AmountPlnLimitExceededException();
		}
		return amountPln;
	}

}
