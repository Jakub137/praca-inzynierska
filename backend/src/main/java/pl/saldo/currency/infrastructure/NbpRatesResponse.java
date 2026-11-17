package pl.saldo.currency.infrastructure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
record NbpRatesResponse(List<Rate> rates) {

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Rate(LocalDate effectiveDate, BigDecimal mid) {
	}

}
