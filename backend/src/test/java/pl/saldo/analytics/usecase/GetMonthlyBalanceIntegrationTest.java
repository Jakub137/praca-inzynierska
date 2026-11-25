package pl.saldo.analytics.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import pl.saldo.analytics.api.MonthlyBalanceResponse;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

// Date rules: the use case is built by hand with a fixed Clock on the real repository (no second Spring context).
// The HTTP tests use a real token and the real Clock bean.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class GetMonthlyBalanceIntegrationTest {

	private static final String BALANCE_URI = "/api/v1/analytics/monthly-balance";
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	// Seeded system category "Wynagrodzenie" (V2_1), shared by all users.
	private static final long SYSTEM_INCOME_CATEGORY_ID = 9L;

	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	private final MockMvcTester mvc;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity owner;
	private CategoryEntity incomeCategory;
	private CategoryEntity expenseCategory;

	@Autowired
	GetMonthlyBalanceIntegrationTest(UserRepository userRepository, CategoryRepository categoryRepository,
			TransactionRepository transactionRepository, MockMvcTester mvc, JwtService jwtService, Clock clock) {
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
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
	void shouldSumAmountPlnByMonthAndTypeAndFillEmptyMonthWithZeros() {
		saveTransaction(owner, incomeCategory, "1000.00", LocalDate.of(2026, 9, 1), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "500.50", LocalDate.of(2026, 9, 15), TransactionType.INCOME);
		saveTransaction(owner, expenseCategory, "200.00", LocalDate.of(2026, 9, 10), TransactionType.EXPENSE);
		saveTransaction(owner, saveCategory(owner, "Rachunki", TransactionType.EXPENSE), "100.25",
				LocalDate.of(2026, 9, 20), TransactionType.EXPENSE);
		// A foreign currency: only amount_pln (430.00) may be summed, never the original amount (100.00).
		transactionRepository.saveAndFlush(new TransactionEntity(owner.getId(), expenseCategory,
				new BigDecimal("100.00"), SupportedCurrency.EUR, new BigDecimal("430.00"), new BigDecimal("4.3000"),
				LocalDate.of(2026, 11, 5), null, TransactionType.EXPENSE, Instant.now(NOVEMBER_CLOCK)));

		List<MonthlyBalanceResponse> result = balance("3");

		assertThat(result).containsExactly(
				month("2026-09", "1500.50", "300.25"),
				month("2026-10", "0.00", "0.00"),
				month("2026-11", "0.00", "430.00"));
	}

	@Test
	void shouldIncludeWholeBoundaryMonthsAndExcludeDaysOutside() {
		saveTransaction(owner, incomeCategory, "1.00", LocalDate.of(2026, 9, 30), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "10.00", LocalDate.of(2026, 10, 1), TransactionType.INCOME);
		// After "today" (20 Nov), but still in the current month.
		saveTransaction(owner, incomeCategory, "20.00", LocalDate.of(2026, 11, 30), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "2.00", LocalDate.of(2026, 12, 1), TransactionType.INCOME);

		List<MonthlyBalanceResponse> result = balance("2");

		assertThat(result).containsExactly(
				month("2026-10", "10.00", "0.00"),
				month("2026-11", "20.00", "0.00"));
	}

	@Test
	void shouldNotMixSameMonthOfDifferentYears() {
		saveTransaction(owner, incomeCategory, "999.00", LocalDate.of(2025, 11, 30), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "50.00", LocalDate.of(2025, 12, 1), TransactionType.INCOME);
		saveTransaction(owner, incomeCategory, "70.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);

		List<MonthlyBalanceResponse> result = balance("12");

		assertThat(result).hasSize(12);
		assertThat(result.getFirst()).isEqualTo(month("2025-12", "50.00", "0.00"));
		assertThat(result.getLast()).isEqualTo(month("2026-11", "70.00", "0.00"));
	}

	@Test
	void shouldExcludeOtherUsersTransactionsInSharedSystemCategory() {
		CategoryEntity systemCategory = categoryRepository.findById(SYSTEM_INCOME_CATEGORY_ID).orElseThrow();
		UserEntity other = saveUser("other@example.com");
		saveTransaction(owner, systemCategory, "100.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);
		saveTransaction(other, systemCategory, "5000.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);

		List<MonthlyBalanceResponse> result = balance("1");

		assertThat(result).containsExactly(month("2026-11", "100.00", "0.00"));
	}

	@Test
	void shouldReturnSixZeroMonthsForNewUser() {
		List<MonthlyBalanceResponse> result = balance(null);

		assertThat(result).containsExactly(
				month("2026-06", "0.00", "0.00"),
				month("2026-07", "0.00", "0.00"),
				month("2026-08", "0.00", "0.00"),
				month("2026-09", "0.00", "0.00"),
				month("2026-10", "0.00", "0.00"),
				month("2026-11", "0.00", "0.00"));
	}

	@Test
	void shouldReturnBalanceOfAuthenticatedUserThroughHttp() {
		// The real Clock bean: the transaction is dated today in Warsaw, so the result does not depend on the run date.
		LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		saveTransaction(owner, incomeCategory, "250.00", today, TransactionType.INCOME);
		UserEntity other = saveUser("other@example.com");
		saveTransaction(other, saveCategory(other, "Pensja", TransactionType.INCOME), "999.00", today,
				TransactionType.INCOME);

		MvcTestResult result = getBalance("2");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.length()").isEqualTo(2);
		assertThat(result).bodyJson().extractingPath("$[1].month").isEqualTo(YearMonth.from(today).toString());
		assertThat(result).bodyJson().extractingPath("$[0].income").isEqualTo(0.0);
		assertThat(result).bodyJson().extractingPath("$[1].income").isEqualTo(250.0);
		assertThat(result).bodyJson().extractingPath("$[1].expenses").isEqualTo(0.0);
	}

	@ParameterizedTest
	@ValueSource(strings = { "13", "abc", "" })
	void shouldReturn400WithFieldErrorsThroughHttp(String months) {
		MvcTestResult result = getBalance(months);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("months");
	}

	private MvcTestResult getBalance(String months) {
		return mvc.get().uri(BALANCE_URI)
				.param("months", months)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(owner))
				.exchange();
	}

	private List<MonthlyBalanceResponse> balance(String months) {
		return new GetMonthlyBalanceUseCase(transactionRepository, NOVEMBER_CLOCK)
				.execute(owner.getId(), new GetMonthlyBalanceQuery(months));
	}

	private static MonthlyBalanceResponse month(String month, String income, String expenses) {
		return new MonthlyBalanceResponse(month, new BigDecimal(income), new BigDecimal(expenses));
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(new UserEntity(
				email, "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, Instant.now(NOVEMBER_CLOCK)));
	}

	private CategoryEntity saveCategory(UserEntity user, String name, TransactionType type) {
		return categoryRepository.saveAndFlush(new CategoryEntity(user.getId(), name, null, type));
	}

	private void saveTransaction(UserEntity user, CategoryEntity category, String amountPln, LocalDate date,
			TransactionType type) {
		BigDecimal amount = new BigDecimal(amountPln);
		transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, amount, SupportedCurrency.PLN, amount, new BigDecimal("1.0000"), date, null,
				type, Instant.now(NOVEMBER_CLOCK)));
	}

}
