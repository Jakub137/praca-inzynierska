package pl.saldo.analytics.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// dateFrom and dateTo are the period actually used (both inclusive), also when the request had no dates.
public record CategoryDistributionResponse(
		LocalDate dateFrom,
		LocalDate dateTo,
		BigDecimal totalExpenses,
		List<CategoryShareResponse> categories) {

}
