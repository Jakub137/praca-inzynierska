package pl.saldo.currency.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.currency.usecase.GetCurrentRatesUseCase;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(CurrencyController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class CurrencyControllerTest {

	private static final String RATES_URI = "/api/v1/currency/rates";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-18T10:00:00Z");
	private static final LocalDate PUBLICATION_DATE = LocalDate.of(2026, 11, 17);

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetCurrentRatesUseCase getCurrentRatesUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithRatesSourceAndPublicationDate() {
		authenticate();
		given(getCurrentRatesUseCase.execute()).willReturn(new CurrencyRatesResponse(List.of(
				rate(SupportedCurrency.EUR, "4.3100", RateSource.NBP),
				rate(SupportedCurrency.USD, "3.9800", RateSource.FALLBACK),
				rate(SupportedCurrency.GBP, "5.0900", RateSource.NBP),
				rate(SupportedCurrency.CHF, "4.6300", RateSource.NBP))));

		MvcTestResult result = getRates();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.rates.length()").isEqualTo(4);
		assertThat(result).bodyJson().extractingPath("$.rates[0].currency").isEqualTo("EUR");
		assertThat(result).bodyJson().extractingPath("$.rates[0].rate").isInstanceOf(Number.class);
		assertThat(result).bodyJson().extractingPath("$.rates[0].rate").isEqualTo(4.31);
		assertThat(result).bodyJson().extractingPath("$.rates[0].effectiveDate").isEqualTo("2026-11-17");
		assertThat(result).bodyJson().extractingPath("$.rates[0].source").isEqualTo("NBP");
		assertThat(result).bodyJson().extractingPath("$.rates[1].currency").isEqualTo("USD");
		assertThat(result).bodyJson().extractingPath("$.rates[1].source").isEqualTo("FALLBACK");
		assertThat(result).bodyJson().extractingPath("$.rates[2].currency").isEqualTo("GBP");
		assertThat(result).bodyJson().extractingPath("$.rates[3].currency").isEqualTo("CHF");
		then(getCurrentRatesUseCase).should().execute();
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(RATES_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getCurrentRatesUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn503WithPolishMessageWhenRateIsUnavailable() {
		authenticate();
		given(getCurrentRatesUseCase.execute()).willThrow(new ExchangeRateUnavailableException("NBP down"));

		MvcTestResult result = getRates();

		assertThat(result).hasStatus(HttpStatus.SERVICE_UNAVAILABLE);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Usługa niedostępna");
		assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo(
				"Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	private static CurrencyRateResponse rate(SupportedCurrency currency, String rate, RateSource source) {
		return new CurrencyRateResponse(currency, new BigDecimal(rate), PUBLICATION_DATE, source);
	}

	private MvcTestResult getRates() {
		return mvc.get().uri(RATES_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.exchange();
	}

	private void authenticate() {
		UserEntity entity = new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(entity, "id", USER_ID);
		given(jwtService.extractUserId(TOKEN)).willReturn(USER_ID);
		given(userRepository.findById(USER_ID)).willReturn(Optional.of(entity));
		given(jwtService.isTokenValid(eq(TOKEN), any(UserPrincipal.class))).willReturn(true);
	}

}
