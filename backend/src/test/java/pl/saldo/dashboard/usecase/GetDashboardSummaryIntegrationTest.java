package pl.saldo.dashboard.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.budget.domain.BudgetLimitEntity;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.dashboard.api.DashboardSummaryResponse;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

// Date rules: the use case is built by hand with a fixed Clock on real repositories (no second Spring context).
// One test goes through HTTP with a real token and the real Clock bean.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class GetDashboardSummaryIntegrationTest {

	private static final String SUMMARY_URI = "/api/v1/dashboard/summary";
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	private static final Clock MONTH_END_CLOCK = Clock.fixed(Instant.parse("2026-11-30T23:30:00Z"), ZoneOffset.UTC);
	private static final int YEAR = 2026;
	private static final int NOVEMBER = 11;

	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final BudgetLimitRepository budgetLimitRepository;
	private final TransactionRepository transactionRepository;
	private final MockMvcTester mvc;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity owner;
	private CategoryEntity incomeCategory;
	private CategoryEntity expenseCategory;

	@Autowired
	GetDashboardSummaryIntegrationTest(UserRepository userRepository, CategoryRepository categoryRepository,
			BudgetLimitRepository budgetLimitRepository, TransactionRepository transactionRepository,
			MockMvcTester mvc, JwtService jwtService, Clock clock) {
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.budgetLimitRepository = budgetLimitRepository;
		this.transactionRepository = transactionRepository;
		this.mvc = mvc;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		owner = saveUser("owner@example.com");
		incomeCategory = saveCategory(owner, "Pensja", TransactionType.INCOME);
		expenseCategory = saveCategory(owner, "Zakupy", TransactionType.EXPENSE);
	}

	@Test
	void shouldExcludeOtherUsersTransactionsAndLimits() {
		saveTransaction(owner, incomeCategory, "1000.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);
		saveTransaction(owner, expenseCategory, "100.00", LocalDate.of(2026, 11, 12), TransactionType.EXPENSE);
		saveLimit(owner, expenseCategory, NOVEMBER, "300.00");
		UserEntity other = saveUser("other@example.com");
		CategoryEntity otherIncome = saveCategory(other, "Pensja", TransactionType.INCOME);
		CategoryEntity otherExpense = saveCategory(other, "Zakupy", TransactionType.EXPENSE);
		saveTransaction(other, otherIncome, "5000.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);
		saveTransaction(other, otherExpense, "700.00", LocalDate.of(2026, 11, 12), TransactionType.EXPENSE);
		saveLimit(other, otherExpense, NOVEMBER, "900.00");

		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		assertThat(result).isEqualTo(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("900.00"), null, new BigDecimal("100.00"), new BigDecimal("1000.00"),
				new BigDecimal("300.00")));
	}

	@Test
	void shouldExcludeFutureDatedTransactionsFromAvailableFundsButKeepThemInMonthTotals() {
		saveTransaction(owner, incomeCategory, "40.00", LocalDate.of(2026, 11, 19), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "1000.00", LocalDate.of(2026, 11, 20), TransactionType.INCOME);
		saveTransaction(owner, expenseCategory, "100.00", LocalDate.of(2026, 11, 21), TransactionType.EXPENSE);
		saveTransaction(owner, expenseCategory, "200.00", LocalDate.of(2026, 11, 25), TransactionType.EXPENSE);
		saveTransaction(owner, expenseCategory, "500.00", LocalDate.of(2026, 12, 1), TransactionType.EXPENSE);

		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		// Today (20 Nov) counts; 21 and 25 Nov change only the month total; 1 Dec is outside both.
		assertThat(result.availableFunds()).isEqualTo(new BigDecimal("1040.00"));
		assertThat(result.monthIncome()).isEqualTo(new BigDecimal("1040.00"));
		assertThat(result.monthExpenses()).isEqualTo(new BigDecimal("300.00"));
	}

	@Test
	void shouldReturnZerosAndNullsForNewUser() {
		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		assertThat(result).isEqualTo(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("0.00"), null, new BigDecimal("0.00"), new BigDecimal("0.00"), null));
	}

	@Test
	void shouldReturnNullChangeWhenPreviousBalanceIsNotPositive() {
		saveTransaction(owner, expenseCategory, "100.00", LocalDate.of(2026, 10, 5), TransactionType.EXPENSE);
		saveTransaction(owner, incomeCategory, "50.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);

		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		assertThat(result.availableFunds()).isEqualTo(new BigDecimal("-50.00"));
		assertThat(result.availableFundsChangePercent()).isNull();
		assertThat(result.monthIncome()).isEqualTo(new BigDecimal("50.00"));
		assertThat(result.monthExpenses()).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldCompareAgainstBalanceAtEndOfPreviousMonth() {
		saveTransaction(owner, incomeCategory, "1000.00", LocalDate.of(2026, 10, 31), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "100.00", LocalDate.of(2026, 11, 1), TransactionType.INCOME);
		saveTransaction(owner, expenseCategory, "50.00", LocalDate.of(2026, 11, 5), TransactionType.EXPENSE);

		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		// 31 Oct belongs to the previous balance (1000.00), 1 Nov does not: (1050.00 - 1000.00) * 100 / 1000.00.
		assertThat(result.availableFunds()).isEqualTo(new BigDecimal("1050.00"));
		assertThat(result.availableFundsChangePercent()).isEqualTo(new BigDecimal("5.0"));
		assertThat(result.monthIncome()).isEqualTo(new BigDecimal("100.00"));
		assertThat(result.monthExpenses()).isEqualTo(new BigDecimal("50.00"));
	}

	@Test
	void shouldSwitchToNextMonthAtWarsawMidnightWhenClockIsStillInPreviousMonthInUtc() {
		saveTransaction(owner, incomeCategory, "1000.00", LocalDate.of(2026, 11, 30), TransactionType.INCOME);
		saveTransaction(owner, expenseCategory, "100.00", LocalDate.of(2026, 11, 30), TransactionType.EXPENSE);
		saveTransaction(owner, incomeCategory, "50.00", LocalDate.of(2026, 12, 1), TransactionType.INCOME);
		saveLimit(owner, expenseCategory, NOVEMBER, "200.00");
		saveLimit(owner, saveCategory(owner, "Rachunki", TransactionType.EXPENSE), 12, "300.00");

		DashboardSummaryResponse result = summary(MONTH_END_CLOCK);

		// 23:30 UTC on 30 Nov is 1 Dec in Warsaw: previous balance 900.00, balance today 950.00 -> 5.6 (5.555...).
		assertThat(result).isEqualTo(new DashboardSummaryResponse(
				"2026-12", new BigDecimal("950.00"), new BigDecimal("5.6"), new BigDecimal("0.00"),
				new BigDecimal("50.00"), new BigDecimal("300.00")));
	}

	@Test
	void shouldSumLimitsOfCurrentMonthOnly() {
		saveLimit(owner, expenseCategory, NOVEMBER, "1000.00");
		saveLimit(owner, saveCategory(owner, "Rachunki", TransactionType.EXPENSE), NOVEMBER, "500.00");
		saveLimit(owner, saveCategory(owner, "Podróże", TransactionType.EXPENSE), 10, "200.00");
		UserEntity other = saveUser("other@example.com");
		saveLimit(other, saveCategory(other, "Zakupy", TransactionType.EXPENSE), NOVEMBER, "700.00");

		DashboardSummaryResponse result = summary(NOVEMBER_CLOCK);

		assertThat(result.monthLimitTotal()).isEqualTo(new BigDecimal("1500.00"));
	}

	@Test
	void shouldReturnSummaryOfAuthenticatedUserThroughHttp() {
		// The real Clock bean: the transaction is dated today in Warsaw, so the result does not depend on the run date.
		LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		saveTransaction(owner, incomeCategory, "250.00", today, TransactionType.INCOME);
		UserEntity other = saveUser("other@example.com");
		saveTransaction(other, saveCategory(other, "Pensja", TransactionType.INCOME), "999.00", today,
				TransactionType.INCOME);

		MvcTestResult result = mvc.get().uri(SUMMARY_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(owner))
				.exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.month").isEqualTo(YearMonth.from(today).toString());
		assertThat(result).bodyJson().extractingPath("$.availableFunds").isEqualTo(250.0);
		assertThat(result).bodyJson().extractingPath("$.monthIncome").isEqualTo(250.0);
		assertThat(result).bodyJson().extractingPath("$.monthExpenses").isEqualTo(0.0);
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	private DashboardSummaryResponse summary(Clock clock) {
		return new GetDashboardSummaryUseCase(transactionRepository, budgetLimitRepository, clock)
				.execute(owner.getId());
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(new UserEntity(
				email, "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, Instant.now(NOVEMBER_CLOCK)));
	}

	private CategoryEntity saveCategory(UserEntity user, String name, TransactionType type) {
		return categoryRepository.saveAndFlush(new CategoryEntity(user.getId(), name, null, type));
	}

	private void saveLimit(UserEntity user, CategoryEntity category, int month, String amount) {
		budgetLimitRepository.saveAndFlush(new BudgetLimitEntity(
				user.getId(), category.getId(), month, YEAR, new BigDecimal(amount), Instant.now(NOVEMBER_CLOCK)));
	}

	private void saveTransaction(UserEntity user, CategoryEntity category, String amountPln, LocalDate date,
			TransactionType type) {
		BigDecimal amount = new BigDecimal(amountPln);
		transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, amount, SupportedCurrency.PLN, amount, new BigDecimal("1.0000"), date, null,
				type, Instant.now(NOVEMBER_CLOCK)));
	}

}
