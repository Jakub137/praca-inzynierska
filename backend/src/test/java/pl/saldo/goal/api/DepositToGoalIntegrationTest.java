package pl.saldo.goal.api;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.shared.security.JwtService;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class DepositToGoalIntegrationTest {

	private static final String GOALS_URI = "/api/v1/savings-goals";

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final SavingsGoalRepository savingsGoalRepository;
	private final JdbcTemplate jdbcTemplate;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity user;
	private UserEntity otherUser;
	private String token;
	private LocalDate today;

	@Autowired
	DepositToGoalIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			SavingsGoalRepository savingsGoalRepository, JdbcTemplate jdbcTemplate, JwtService jwtService,
			Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.savingsGoalRepository = savingsGoalRepository;
		this.jdbcTemplate = jdbcTemplate;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		otherUser = userRepository.saveAndFlush(new UserEntity(
				"anna.nowak@example.com", "stored-hash", "Anna", "Nowak", SupportedCurrency.PLN,
				Instant.now(clock)));
		token = jwtService.generateToken(user);
		today = SavingsGoalDates.today(clock);
	}

	@Test
	void shouldDepositAndPersistNewAmount() {
		SavingsGoalEntity goal = saveGoal(user, "0.00");

		MvcTestResult result = deposit(goal.getId(), "1500.50");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.currentAmount").isEqualTo(1500.5);
		assertThat(result).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
		assertThat(storedAmount(goal)).isEqualByComparingTo(new BigDecimal("1500.50"));
	}

	@Test
	void shouldReportCompletedAndAllowOverpayment() {
		SavingsGoalEntity goal = saveGoal(user, "0.00");

		MvcTestResult reached = deposit(goal.getId(), "6000.00");
		MvcTestResult overpaid = deposit(goal.getId(), "100.00");

		assertThat(reached).hasStatus(HttpStatus.OK);
		assertThat(reached).bodyJson().extractingPath("$.status").isEqualTo("COMPLETED");
		assertThat(overpaid).hasStatus(HttpStatus.OK);
		assertThat(overpaid).bodyJson().extractingPath("$.currentAmount").isEqualTo(6100.0);
		assertThat(overpaid).bodyJson().extractingPath("$.status").isEqualTo("COMPLETED");
		assertThat(overpaid).bodyJson().extractingPath("$.monthlyContribution").isEqualTo(0.0);
		assertThat(storedAmount(goal)).isEqualByComparingTo(new BigDecimal("6100.00"));
	}

	@Test
	void shouldReturn404AndLeaveForeignGoalUntouched() {
		SavingsGoalEntity foreign = saveGoal(otherUser, "0.00");

		MvcTestResult result = deposit(foreign.getId(), "100.00");

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(storedAmount(foreign)).isEqualByComparingTo(BigDecimal.ZERO);
	}

	@Test
	void shouldReturn404ForMissingGoal() {
		MvcTestResult result = deposit(999_999_999L, "100.00");

		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void shouldAcceptDepositReachingMaximumTotal() {
		SavingsGoalEntity goal = saveGoal(user, "9999999999.98");

		MvcTestResult result = deposit(goal.getId(), "0.01");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(storedAmount(goal)).isEqualByComparingTo(new BigDecimal("9999999999.99"));
	}

	@Test
	void shouldReturn400AndKeepAmountWhenTotalWouldExceedMaximum() {
		SavingsGoalEntity goal = saveGoal(user, "9999999999.98");

		MvcTestResult result = deposit(goal.getId(), "0.02");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(storedAmount(goal)).isEqualByComparingTo(new BigDecimal("9999999999.98"));
	}

	@Test
	void shouldReturn400AndKeepAmountWhenDepositIsZero() {
		SavingsGoalEntity goal = saveGoal(user, "100.00");

		MvcTestResult result = deposit(goal.getId(), "0");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("amount");
		assertThat(storedAmount(goal)).isEqualByComparingTo(new BigDecimal("100.00"));
	}

	private MvcTestResult deposit(Long id, String amount) {
		return mvc.post().uri(GOALS_URI + "/" + id + "/deposit")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"amount": %s}""".formatted(amount))
				.exchange();
	}

	// The amount is set on the entity before the first save, so the persistence context never holds a stale value.
	private SavingsGoalEntity saveGoal(UserEntity owner, String currentAmount) {
		SavingsGoalEntity goal = new SavingsGoalEntity(
				owner.getId(), "Wakacje", new BigDecimal("6000.00"), today.plusMonths(6), Instant.now(clock));
		ReflectionTestUtils.setField(goal, "currentAmount", new BigDecimal(currentAmount));
		return savingsGoalRepository.saveAndFlush(goal);
	}

	private BigDecimal storedAmount(SavingsGoalEntity goal) {
		savingsGoalRepository.flush();
		return jdbcTemplate.queryForObject(
				"SELECT current_amount FROM savings_goals WHERE id = ?", BigDecimal.class, goal.getId());
	}

}
