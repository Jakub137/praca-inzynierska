package pl.saldo.analytics.api;

import java.math.BigDecimal;

// month uses the "YYYY-MM" format; amounts are in PLN with 2 decimals.
public record MonthlyBalanceResponse(String month, BigDecimal income, BigDecimal expenses) {

}
