package pl.saldo.goal.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.goal.domain.MonthlyContributionCalculator;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.shared.security.JwtService;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class SavingsGoalFlowIntegrationTest {

	private static final String GOALS_URI = "/api/v1/savings-goals";
	private static final int MONTHS_TO_GOAL = 6;
	private static final BigDecimal TARGET_AMOUNT = new BigDecimal("6000.00");
	private static final BigDecimal EXTRA_DEPOSIT = new BigDecimal("1200.00");

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private String token;
	private LocalDate today;

	@Autowired
	SavingsGoalFlowIntegrationTest(MockMvcTester mvc, UserRepository userRepository, JwtService jwtService,
			Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		UserEntity user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		token = jwtService.generateToken(user);
		today = SavingsGoalDates.today(clock);
	}

	@Test
	void shouldLowerMonthlyContributionAfterExtraDeposit() {
		LocalDate targetDate = today.plusMonths(MONTHS_TO_GOAL);
		long months = MonthlyContributionCalculator.monthsRemaining(today, targetDate);
		BigDecimal expectedBefore = MonthlyContributionCalculator.monthlyContribution(
				TARGET_AMOUNT, BigDecimal.ZERO, months);
		BigDecimal expectedAfter = MonthlyContributionCalculator.monthlyContribution(
				TARGET_AMOUNT, EXTRA_DEPOSIT, months);

		MvcTestResult created = createGoal(targetDate);
		assertThat(created).hasStatus(HttpStatus.CREATED);
		long goalId = JsonPath.<Number>read(responseBody(created), "$.id").longValue();
		BigDecimal before = contributionOf(created);

		MvcTestResult deposited = deposit(goalId, EXTRA_DEPOSIT);
		MvcTestResult listed = mvc.get().uri(GOALS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();

		assertThat(deposited).hasStatus(HttpStatus.OK);
		BigDecimal after = contributionOf(deposited);
		assertThat(before).isEqualByComparingTo(expectedBefore);
		assertThat(after).isEqualByComparingTo(expectedAfter);
		assertThat(after).isLessThan(before);
		assertThat(listed).hasStatus(HttpStatus.OK);
		assertThat(listed).bodyJson().extractingPath("$[0].monthlyContribution")
				.isEqualTo(expectedAfter.doubleValue());
	}

	private MvcTestResult createGoal(LocalDate targetDate) {
		return mvc.post().uri(GOALS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Wakacje", "targetAmount": %s, "targetDate": "%s"}"""
						.formatted(TARGET_AMOUNT.toPlainString(), targetDate))
				.exchange();
	}

	private MvcTestResult deposit(long goalId, BigDecimal amount) {
		return mvc.post().uri(GOALS_URI + "/" + goalId + "/deposit")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"amount": %s}""".formatted(amount.toPlainString()))
				.exchange();
	}

	private static BigDecimal contributionOf(MvcTestResult result) {
		return BigDecimal.valueOf(JsonPath.<Number>read(responseBody(result), "$.monthlyContribution").doubleValue());
	}

	private static String responseBody(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		} catch (UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

}
