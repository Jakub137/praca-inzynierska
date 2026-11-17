package pl.saldo.currency.infrastructure;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.Optional;

import org.springframework.web.reactive.function.client.WebClient;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;

public class NbpExchangeRateProvider implements ExchangeRateProvider {

	private static final int LOOKBACK_DAYS = 10;
	private static final long CACHE_MAX_SIZE = 500;
	private static final Duration CACHE_TTL = Duration.ofHours(1);
	private static final String RATES_PATH = "/api/exchangerates/rates/a/{code}/{startDate}/{endDate}/?format=json";

	private final WebClient webClient;
	private final Clock clock;
	private final Duration requestTimeout;
	private final Cache<RateKey, BigDecimal> cache = Caffeine.newBuilder()
			.maximumSize(CACHE_MAX_SIZE)
			.expireAfterWrite(CACHE_TTL)
			.build();

	public NbpExchangeRateProvider(WebClient webClient, Clock clock, Duration requestTimeout) {
		this.webClient = webClient;
		this.clock = clock;
		this.requestTimeout = requestTimeout;
	}

	@Override
	public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
		// NBP rejects future dates, so the range never ends after today.
		LocalDate endDate = earlierOf(date, LocalDate.now(clock));
		return cache.get(new RateKey(currency, endDate), this::loadRate);
	}

	private BigDecimal loadRate(RateKey key) {
		// NBP publishes no table on weekends and holidays (and before ~12:00 on working days),
		// so we ask for a window and use the newest published day in it.
		LocalDate startDate = key.endDate().minusDays(LOOKBACK_DAYS);
		NbpRatesResponse response = requestRates(key.currency(), startDate, key.endDate());
		return latestRate(response).orElseThrow(() -> new ExchangeRateUnavailableException(
				"NBP returned no rate for " + key.currency() + " up to " + key.endDate()));
	}

	private NbpRatesResponse requestRates(SupportedCurrency currency, LocalDate startDate, LocalDate endDate) {
		try {
			return webClient.get()
					.uri(RATES_PATH, currency.name(), startDate, endDate)
					.retrieve()
					.bodyToMono(NbpRatesResponse.class)
					.timeout(requestTimeout)
					.block();
		} catch (RuntimeException e) {
			throw new ExchangeRateUnavailableException(
					"NBP request failed for " + currency + " between " + startDate + " and " + endDate, e);
		}
	}

	private static Optional<BigDecimal> latestRate(NbpRatesResponse response) {
		if (response == null || response.rates() == null) {
			return Optional.empty();
		}
		return response.rates().stream()
				.filter(rate -> rate.effectiveDate() != null && rate.mid() != null)
				.max(Comparator.comparing(NbpRatesResponse.Rate::effectiveDate))
				.map(NbpRatesResponse.Rate::mid);
	}

	private static LocalDate earlierOf(LocalDate first, LocalDate second) {
		return first.isBefore(second) ? first : second;
	}

	private record RateKey(SupportedCurrency currency, LocalDate endDate) {
	}

}
