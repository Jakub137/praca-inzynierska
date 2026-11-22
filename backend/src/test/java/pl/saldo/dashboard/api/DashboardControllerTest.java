package pl.saldo.dashboard.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Instant;
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

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.dashboard.usecase.GetDashboardSummaryUseCase;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(DashboardController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class DashboardControllerTest {

	private static final String SUMMARY_URI = "/api/v1/dashboard/summary";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-22T10:00:00Z");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetDashboardSummaryUseCase getDashboardSummaryUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithSummaryAndWithoutUserId() {
		authenticate();
		given(getDashboardSummaryUseCase.execute(USER_ID)).willReturn(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("3799.50"), new BigDecimal("26.7"), new BigDecimal("200.50"),
				new BigDecimal("1000.00"), new BigDecimal("1500.00")));

		MvcTestResult result = getSummary();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.month").isEqualTo("2026-11");
		assertThat(result).bodyJson().extractingPath("$.availableFunds").isEqualTo(3799.5);
		assertThat(result).bodyJson().extractingPath("$.availableFundsChangePercent").isEqualTo(26.7);
		assertThat(result).bodyJson().extractingPath("$.monthExpenses").isEqualTo(200.5);
		assertThat(result).bodyJson().extractingPath("$.monthIncome").isEqualTo(1000.0);
		assertThat(result).bodyJson().extractingPath("$.monthLimitTotal").isEqualTo(1500.0);
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldExposeNullChangeAndNullLimitTotalAsJsonNull() {
		authenticate();
		given(getDashboardSummaryUseCase.execute(USER_ID)).willReturn(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("0.00"), null, new BigDecimal("0.00"), new BigDecimal("0.00"), null));

		MvcTestResult result = getSummary();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().hasPath("$.availableFundsChangePercent");
		assertThat(result).bodyJson().extractingPath("$.availableFundsChangePercent").isNull();
		assertThat(result).bodyJson().hasPath("$.monthLimitTotal");
		assertThat(result).bodyJson().extractingPath("$.monthLimitTotal").isNull();
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(SUMMARY_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getDashboardSummaryUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult getSummary() {
		return mvc.get().uri(SUMMARY_URI)
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
