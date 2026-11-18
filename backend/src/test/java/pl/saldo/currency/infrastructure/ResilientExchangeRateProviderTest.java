package pl.saldo.currency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.function.Supplier;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;
import reactor.core.publisher.Mono;

class ResilientExchangeRateProviderTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-17T10:00:00Z"), ZoneOffset.UTC);
	private static final Duration TIMEOUT = Duration.ofMillis(200);
	private static final LocalDate TUESDAY = LocalDate.of(2026, 11, 17);
	private static final LocalDate MONDAY = LocalDate.of(2026, 11, 16);
	private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 15);
	private static final LocalDate FRIDAY = LocalDate.of(2026, 11, 13);
	private static final BigDecimal RATE = new BigDecimal("4.4032");
	private static final ExchangeRateQuote QUOTE = new ExchangeRateQuote(RATE, TUESDAY, RateSource.NBP);
	private static final String TUESDAY_RESPONSE = """
			{"table":"A","currency":"euro","code":"EUR","rates":[
			{"no":"223/A/NBP/2026","effectiveDate":"2026-11-17","mid":4.4032}]}
			""";

	private ExchangeRateProvider primary;
	private FallbackExchangeRateProvider fallback;
	private ResilientExchangeRateProvider provider;
	private Supplier<Mono<ClientResponse>> nextNbpResponse;
	private ResilientExchangeRateProvider nbpBackedProvider;
	private Logger logger;
	private ListAppender<ILoggingEvent> logAppender;

	@BeforeEach
	void setUp() {
		primary = mock(ExchangeRateProvider.class);
		fallback = new FallbackExchangeRateProvider();
		provider = new ResilientExchangeRateProvider(primary, fallback);

		WebClient webClient = WebClient.builder()
				.baseUrl("https://api.nbp.pl")
				.exchangeFunction(request -> nextNbpResponse.get())
				.build();
		nbpBackedProvider = new ResilientExchangeRateProvider(
				new NbpExchangeRateProvider(webClient, CLOCK, TIMEOUT), fallback);

		logger = (Logger) LoggerFactory.getLogger(ResilientExchangeRateProvider.class);
		logAppender = new ListAppender<>();
		logAppender.start();
		logger.addAppender(logAppender);
	}

	@AfterEach
	void tearDown() {
		logger.detachAppender(logAppender);
	}

	@Test
	void shouldReturnPrimaryQuoteAndRememberItWithoutLogging() {
		when(primary.fetchQuote(any(), any())).thenReturn(QUOTE);

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, TUESDAY);

		assertThat(quote).isEqualTo(QUOTE);
		assertThat(quote.source()).isEqualTo(RateSource.NBP);
		assertThat(fallback.getRate(SupportedCurrency.EUR, TUESDAY)).isEqualTo(RATE);
		assertThat(logAppender.list).isEmpty();
	}

	@Test
	void shouldReturnLastKnownRateWhenPrimaryIsUnavailable() {
		when(primary.fetchQuote(any(), any()))
				.thenReturn(QUOTE)
				.thenThrow(new ExchangeRateUnavailableException("NBP down"));
		provider.getRate(SupportedCurrency.EUR, TUESDAY);

		BigDecimal rate = provider.getRate(SupportedCurrency.EUR, MONDAY);

		assertThat(rate).isEqualTo(RATE);
	}

	@Test
	void shouldReturnFallbackQuoteWithPublicationDateInsteadOfRequestedDate() {
		ExchangeRateQuote fridayQuote = new ExchangeRateQuote(RATE, FRIDAY, RateSource.NBP);
		when(primary.fetchQuote(any(), any()))
				.thenReturn(fridayQuote)
				.thenThrow(new ExchangeRateUnavailableException("NBP down"));
		provider.getQuote(SupportedCurrency.EUR, SUNDAY);

		ExchangeRateQuote quote = provider.getQuote(SupportedCurrency.EUR, TUESDAY);

		assertThat(quote.source()).isEqualTo(RateSource.FALLBACK);
		assertThat(quote.effectiveDate()).isEqualTo(FRIDAY).isNotEqualTo(TUESDAY);
		assertThat(quote.rate()).isEqualTo(RATE);
	}

	@Test
	void shouldThrowWhenPrimaryIsUnavailableAndNothingRemembered() {
		when(primary.fetchQuote(any(), any())).thenThrow(new ExchangeRateUnavailableException("NBP down"));

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class)
				.hasMessageContaining("No last known rate for EUR");
	}

	@Test
	void shouldNotUseRateOfAnotherCurrency() {
		when(primary.fetchQuote(eq(SupportedCurrency.EUR), any())).thenReturn(QUOTE);
		when(primary.fetchQuote(eq(SupportedCurrency.USD), any()))
				.thenThrow(new ExchangeRateUnavailableException("NBP down"));
		provider.getRate(SupportedCurrency.EUR, TUESDAY);

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.USD, TUESDAY))
				.isInstanceOf(ExchangeRateUnavailableException.class);
	}

	@Test
	void shouldNotSwallowUnexpectedExceptions() {
		when(primary.fetchQuote(any(), any())).thenThrow(new IllegalStateException("bug"));
		fallback.remember(SupportedCurrency.EUR, QUOTE);

		assertThatThrownBy(() -> provider.getRate(SupportedCurrency.EUR, TUESDAY))
				.isInstanceOf(IllegalStateException.class);
		assertThat(logAppender.list).isEmpty();
	}

	@Test
	void shouldLogWarningWithCurrencyDateAndReasonButNoStackTrace() {
		when(primary.fetchQuote(any(), any()))
				.thenReturn(QUOTE)
				.thenThrow(new ExchangeRateUnavailableException("NBP request failed",
						new IOException("Connection refused")));
		provider.getRate(SupportedCurrency.EUR, TUESDAY);

		provider.getRate(SupportedCurrency.EUR, MONDAY);

		assertThat(logAppender.list).hasSize(1);
		ILoggingEvent event = logAppender.list.get(0);
		assertThat(event.getLevel()).isEqualTo(Level.WARN);
		assertThat(event.getFormattedMessage())
				.contains("EUR", MONDAY.toString(), "Connection refused");
		assertThat(event.getThrowableProxy()).isNull();
	}

	@Test
	void shouldReturnOneForPlnWithoutCallingPrimary() {
		BigDecimal rate = provider.getRate(SupportedCurrency.PLN, TUESDAY);

		assertThat(rate).isEqualTo(BigDecimal.ONE);
		verifyNoInteractions(primary);
	}

	@Test
	void shouldFallBackWhenNbpReturnsServerError() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);
		nbpBackedProvider.getRate(SupportedCurrency.EUR, TUESDAY);
		respondWith(HttpStatus.SERVICE_UNAVAILABLE, "error");

		ExchangeRateQuote quote = nbpBackedProvider.getQuote(SupportedCurrency.EUR, MONDAY);

		assertThat(quote.rate()).isEqualTo(RATE);
		assertThat(quote.source()).isEqualTo(RateSource.FALLBACK);
		assertThat(quote.effectiveDate()).isEqualTo(TUESDAY);
		assertThat(logAppender.list).hasSize(1);
		assertThat(logAppender.list.get(0).getLevel()).isEqualTo(Level.WARN);
	}

	@Test
	void shouldFallBackWhenNbpConnectionFails() {
		respondWith(HttpStatus.OK, TUESDAY_RESPONSE);
		nbpBackedProvider.getRate(SupportedCurrency.EUR, TUESDAY);
		nextNbpResponse = () -> Mono.error(new IOException("Connection refused"));

		BigDecimal rate = nbpBackedProvider.getRate(SupportedCurrency.EUR, MONDAY);

		assertThat(rate).isEqualTo(RATE);
		assertThat(logAppender.list).hasSize(1);
		assertThat(logAppender.list.get(0).getFormattedMessage()).contains("Connection refused");
	}

	private void respondWith(HttpStatus status, String body) {
		nextNbpResponse = () -> Mono.just(ClientResponse.create(status)
				.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
				.body(body)
				.build());
	}

}
