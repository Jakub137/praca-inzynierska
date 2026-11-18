package pl.saldo.currency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;
import reactor.core.publisher.Mono;

class NbpExchangeRateProviderTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-17T10:00:00Z"), ZoneOffset.UTC);
	private static final Duration TIMEOUT = Duration.ofMillis(200);
	private static final LocalDate TUESDAY = LocalDate.of(2026, 11, 17);
	private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 15);
	private static final LocalDate FUTURE_DATE = LocalDate.of(2026, 11, 20);

	private static final String TUESDAY_RESPONSE = """
			{"table":"A","currency":"euro","code":"EUR","rates":[
			{"no":"223/A/NBP/2026","effectiveDate":"2026-11-17","mid":4.4032}]}
			""";
	private static final String WEEKEND_RESPONSE = """
			{"table":"A","currency":"euro","code":"EUR","rates":[
			{"no":"221/A/NBP/2026","effectiveDate":"2026-11-13","mid":4.4070},
			{"no":"220/A/NBP/2026","effectiveDate":"2026-11-12","mid":4.4018}]}
			""";
	private static final String EMPTY_RATES_RESPONSE = """
			{"table":"A","currency":"euro","code":"EUR","rates":[]}
			""";

	private final List<ClientRequest> requests = new ArrayList<>();
	private Supplier<Mono<ClientResponse>> nextResponse;
	private NbpExchangeRateProvider provider;

	@BeforeEach
	void setUp() {
		WebClient webClient = WebClient.builder()
				.baseUrl("https://api.nbp.pl")
				.exchangeFunction(request -> {
					requests.add(request);
					return nextResponse.get();
				})
				.build();
		provider = new NbpExchangeRateProvider(webClient, CLOCK, TIMEOUT);
	}

	@Test
	void shouldReturnMidRateFromNbpResponse() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, TUESDAY);

		assertThat(rate).isEqualTo(new BigDecimal("4.4032"));
		assertThat(requestedUrls()).containsExactly(
				"https://api.nbp.pl/api/exchangerates/rates/a/EUR/2026-11-07/2026-11-17/?format=json");
	}

	@Test
	void shouldUseLatestPublishedDayWhenDateIsWeekend() {
		respondWith(HttpStatus.OK, WEEKEND_RESPONSE);

		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, SUNDAY);

		assertThat(rate).isEqualTo(new BigDecimal("4.4070"));
		assertThat(requestedUrls()).containsExactly(
				"https://api.nbp.pl/api/exchangerates/rates/a/EUR/2026-11-05/2026-11-15/?format=json");
	}

	@Test
	void shouldReturnQuoteWithPublicationDateOfNewestNbpEntry() {
		respondWith(HttpStatus.OK, WEEKEND_RESPONSE);

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, SUNDAY);

		assertThat(quote.rate()).isEqualTo(new BigDecimal("4.4070"));
		assertThat(quote.effectiveDate()).isEqualTo(LocalDate.of(2026, 11, 13));
		assertThat(quote.source()).isEqualTo(RateSource.NBP);
	}

	@Test
	void shouldKeepPublicationDateInCachedQuote() {
		respondWith(HttpStatus.OK, WEEKEND_RESPONSE);
		provider.getQuote(SupportedCurrency.EUR, SUNDAY);

		ExchangeRateQuote cached = provider.getQuote(SupportedCurrency.EUR, SUNDAY);

		assertThat(cached.effectiveDate()).isEqualTo(LocalDate.of(2026, 11, 13));
		assertThat(requests).hasSize(1);
	}

	@Test
	void shouldNotRequestRangeEndingInFuture() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		provider.getRate(SupportedCurrency.EUR, FUTURE_DATE);

		assertThat(requestedUrls()).containsExactly(
				"https://api.nbp.pl/api/exchangerates/rates/a/EUR/2026-11-07/2026-11-17/?format=json");
	}

	@Test
	void shouldNotCallNbpForPln() {
		BigDecimal rate = provider.getRate(SupportedCurrency.PLN, TUESDAY);

		assertThat(rate).isEqualTo(BigDecimal.ONE);
		assertThat(requests).isEmpty();
	}

	@Test
	void shouldCacheRateForSameCurrencyAndDate() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		BigDecimal first = provider.getRate(SupportedCurrency.EUR, TUESDAY);
		BigDecimal second = provider.getRate(SupportedCurrency.EUR, TUESDAY);

		assertThat(second).isEqualTo(first);
		assertThat(requests).hasSize(1);
	}

	@Test
	void shouldShareCacheEntryBetweenTodayAndFutureDate() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		provider.getRate(SupportedCurrency.EUR, TUESDAY);
		provider.getRate(SupportedCurrency.EUR, FUTURE_DATE);

		assertThat(requests).hasSize(1);
	}

	@Test
	void shouldNotShareCacheBetweenCurrencies() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		provider.getRate(SupportedCurrency.EUR, TUESDAY);
		provider.getRate(SupportedCurrency.USD, TUESDAY);

		assertThat(requests).hasSize(2);
	}

	@Test
	void shouldThrowWhenNbpReturnsNotFound() {
		respondWith(HttpStatus.NOT_FOUND, "404 NotFound - Brak danych");

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, SUNDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasCauseInstanceOf(WebClientResponseException.NotFound.class);
	}

	@Test
	void shouldThrowWhenNbpReturnsServerError() {
		respondWith(HttpStatus.INTERNAL_SERVER_ERROR, "error");

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasCauseInstanceOf(WebClientResponseException.InternalServerError.class);
	}

	@Test
	void shouldThrowWhenRatesListIsEmpty() {
		respondWith(HttpStatus.OK, EMPTY_RATES_RESPONSE);

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class);
	}

	@Test
	void shouldThrowWhenResponseBodyIsEmpty() {
		respondWith(HttpStatus.OK, "");

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class);
	}

	@Test
	void shouldThrowWhenConnectionFails() {
		nextResponse = () -> Mono.error(new IOException("Connection refused"));

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasRootCauseInstanceOf(IOException.class);
	}

	@Test
	void shouldThrowWhenRequestTimesOut() {
		nextResponse = Mono::never;

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasRootCauseInstanceOf(TimeoutException.class);
	}

	@Test
	void shouldNotCacheFailedRequest() {
		respondWith(HttpStatus.INTERNAL_SERVER_ERROR, "error");
		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class);
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);

		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, TUESDAY);

		assertThat(rate).isEqualTo(new BigDecimal("4.4032"));
		assertThat(requests).hasSize(2);
	}

	private void respondWith(HttpStatus status, String body) {
		nextResponse = () -> Mono.just(ClientResponse.create(status)
				.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
				.body(body)
				.build());
	}

	private List<String> requestedUrls() {
		return requests.stream().map(request -> request.url().toString()).toList();
	}

}
