package pl.saldo.currency.api;

import java.util.List;

public record CurrencyRatesResponse(List<CurrencyRateResponse> rates) {

	public CurrencyRatesResponse {
		rates = List.copyOf(rates);
	}

}
