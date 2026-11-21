package pl.saldo.goal.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.goal.domain.MonthlyContributionCalculator;
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
class SavingsGoalsIntegrationTest {

	private static final String GOALS_URI = "/api/v1/savings-goals";

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final SavingsGoalRepository savingsGoalRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity user;
	private UserEntity otherUser;
	private String token;
	private LocalDate today;

	@Autowired
	SavingsGoalsIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			SavingsGoalRepository savingsGoalRepository, JwtService jwtService, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.savingsGoalRepository = savingsGoalRepository;
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
	void shouldCreateGoalWithZeroProgressAndListItWithComputedContribution() {
		LocalDate targetDate = today.plusMonths(8);
		long months = MonthlyContributionCalculator.monthsRemaining(today, targetDate);
		BigDecimal expectedContribution = MonthlyContributionCalculator.monthlyContribution(
				new BigDecimal("6000.00"), new BigDecimal("0.00"), months);

		MvcTestResult created = create(body("Wakacje we Włoszech", "6000.00", targetDate));
		MvcTestResult listed = mvc.get().uri(GOALS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(created).hasStatus(HttpStatus.CREATED);
		assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
		assertThat(created).bodyJson().extractingPath("$.currentAmount").isEqualTo(0.0);
		assertThat(created).bodyJson().extractingPath("$.monthsRemaining").isEqualTo((int) months);
		assertThat(created).bodyJson().extractingPath("$.monthlyContribution")
				.isEqualTo(expectedContribution.doubleValue());
		assertThat(listed).hasStatus(HttpStatus.OK);
		assertThat(listed).bodyJson().extractingPath("$[0].name").isEqualTo("Wakacje we Włoszech");
		assertThat(listed).bodyJson().extractingPath("$[0].targetDate").isEqualTo(targetDate.toString());
		List<SavingsGoalEntity> rows = ownGoals();
		assertThat(rows).hasSize(1);
		assertThat(rows.get(0).getCurrentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
	}

	@Test
	void shouldListOnlyOwnGoalsSortedByTargetDateThenId() {
		savingsGoalRepository.saveAndFlush(goal(user, "Późny", today.plusMonths(10)));
		savingsGoalRepository.saveAndFlush(goal(user, "Wcześniejszy 1", today.plusMonths(2)));
		savingsGoalRepository.saveAndFlush(goal(otherUser, "Cudzy", today.plusMonths(1)));
		savingsGoalRepository.saveAndFlush(goal(user, "Wcześniejszy 2", today.plusMonths(2)));

		MvcTestResult listed = mvc.get().uri(GOALS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(listed).hasStatus(HttpStatus.OK);
		assertThat(listed).bodyJson().extractingPath("$.length()").isEqualTo(3);
		assertThat(listed).bodyJson().extractingPath("$[0].name").isEqualTo("Wcześniejszy 1");
		assertThat(listed).bodyJson().extractingPath("$[1].name").isEqualTo("Wcześniejszy 2");
		assertThat(listed).bodyJson().extractingPath("$[2].name").isEqualTo("Późny");
	}

	@Test
	void shouldUpdateAndThenDeleteOwnGoal() {
		SavingsGoalEntity goal = savingsGoalRepository.saveAndFlush(goal(user, "Wakacje", today.plusMonths(6)));
		String uri = GOALS_URI + "/" + goal.getId();

		MvcTestResult updated = update(uri, body("Samochód", "9000.00", today.plusMonths(12)));
		MvcTestResult deleted = mvc.delete().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(updated).hasStatus(HttpStatus.OK);
		assertThat(updated).bodyJson().extractingPath("$.name").isEqualTo("Samochód");
		assertThat(updated).bodyJson().extractingPath("$.targetAmount").isEqualTo(9000.0);
		assertThat(deleted).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(savingsGoalRepository.existsById(goal.getId())).isFalse();
	}

	@Test
	void shouldReturn404AndKeepForeignGoalOnUpdateAndDelete() {
		SavingsGoalEntity foreign = savingsGoalRepository.saveAndFlush(goal(otherUser, "Cudzy", today.plusMonths(6)));
		String uri = GOALS_URI + "/" + foreign.getId();

		MvcTestResult updated = update(uri, body("Przejęty", "1.00", today.plusMonths(7)));
		MvcTestResult deleted = mvc.delete().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();

		assertThat(updated).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(deleted).hasStatus(HttpStatus.NOT_FOUND);
		SavingsGoalEntity stored = savingsGoalRepository.findById(foreign.getId()).orElseThrow();
		assertThat(stored.getName()).isEqualTo("Cudzy");
		assertThat(stored.getTargetAmount()).isEqualByComparingTo(new BigDecimal("6000.00"));
	}

	@Test
	void shouldReturn400AndSaveNothingWhenDeadlineIsToday() {
		MvcTestResult created = create(body("Cel", "100.00", today));

		assertThat(created).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(created).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("targetDate");
		assertThat(ownGoals()).isEmpty();
	}

	private MvcTestResult create(String body) {
		return mvc.post().uri(GOALS_URI)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult update(String uri, String body) {
		return mvc.put().uri(uri)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private String bearer() {
		return "Bearer " + token;
	}

	private static String body(String name, String targetAmount, LocalDate targetDate) {
		return """
				{"name": "%s", "targetAmount": %s, "targetDate": "%s"}""".formatted(name, targetAmount, targetDate);
	}

	private SavingsGoalEntity goal(UserEntity owner, String name, LocalDate targetDate) {
		return new SavingsGoalEntity(
				owner.getId(), name, new BigDecimal("6000.00"), targetDate, Instant.now(clock));
	}

	private List<SavingsGoalEntity> ownGoals() {
		return savingsGoalRepository.findAll().stream()
				.filter(goal -> goal.getUserId().equals(user.getId()))
				.toList();
	}

}
