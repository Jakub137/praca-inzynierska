package pl.saldo.analytics.api;

import java.math.BigDecimal;

// amount is in PLN with 2 decimals; percentage is the share of totalExpenses, rounded to 2 decimals.
public record CategoryShareResponse(Long categoryId, String categoryName, BigDecimal amount, BigDecimal percentage) {

}
