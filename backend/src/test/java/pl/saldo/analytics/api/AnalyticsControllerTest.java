package pl.saldo.analytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Instant;
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

import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.analytics.usecase.GetMonthlyBalanceQuery;
import pl.saldo.analytics.usecase.GetMonthlyBalanceUseCase;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(AnalyticsController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class AnalyticsControllerTest {

	private static final String BALANCE_URI = "/api/v1/analytics/monthly-balance";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-25T10:00:00Z");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetMonthlyBalanceUseCase getMonthlyBalanceUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithListAndPassMissingParameterAsNull() {
		authenticate();
		given(getMonthlyBalanceUseCase.execute(USER_ID, new GetMonthlyBalanceQuery(null))).willReturn(List.of(
				new MonthlyBalanceResponse("2026-10", new BigDecimal("0.00"), new BigDecimal("0.00")),
				new MonthlyBalanceResponse("2026-11", new BigDecimal("1000.00"), new BigDecimal("250.50"))));

		MvcTestResult result = getBalance(BALANCE_URI);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.length()").isEqualTo(2);
		assertThat(result).bodyJson().extractingPath("$[0].month").isEqualTo("2026-10");
		assertThat(result).bodyJson().extractingPath("$[1].month").isEqualTo("2026-11");
		assertThat(result).bodyJson().extractingPath("$[1].income").isEqualTo(1000.0);
		assertThat(result).bodyJson().extractingPath("$[1].expenses").isEqualTo(250.5);
		assertThat(result).bodyJson().doesNotHavePath("$[0].userId");
		assertThat(result).bodyJson().doesNotHavePath("$[0].balance");
	}

	@Test
	void shouldPassMonthsParameterToUseCase() {
		authenticate();
		given(getMonthlyBalanceUseCase.execute(USER_ID, new GetMonthlyBalanceQuery("3"))).willReturn(List.of());

		MvcTestResult result = getBalance(BALANCE_URI + "?months=3");

		assertThat(result).hasStatus(HttpStatus.OK);
		then(getMonthlyBalanceUseCase).should().execute(USER_ID, new GetMonthlyBalanceQuery("3"));
	}

	@Test
	void shouldReturn400WithFieldErrorsWhenMonthsIsNotANumber() {
		authenticate();
		given(getMonthlyBalanceUseCase.execute(USER_ID, new GetMonthlyBalanceQuery("abc")))
				.willThrow(new InvalidAnalyticsQueryException(
						List.of(new ApiFieldError("months", "Liczba miesięcy musi być liczbą całkowitą od 1 do 12"))));

		MvcTestResult result = getBalance(BALANCE_URI + "?months=abc");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("months");
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(BALANCE_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getMonthlyBalanceUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult getBalance(String uri) {
		return mvc.get().uri(uri)
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
