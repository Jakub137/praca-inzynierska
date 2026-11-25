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
import org.junit.jupiter.params.provider.CsvSource;
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
import pl.saldo.analytics.api.CategoryDistributionResponse;
import pl.saldo.analytics.api.CategoryShareResponse;
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

// Aggregation rules: the use case is built by hand with a fixed Clock on the real repository (no second Spring
// context). The HTTP tests use a real token and the real Clock bean.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class GetCategoryDistributionIntegrationTest {

	private static final String DISTRIBUTION_URI = "/api/v1/analytics/category-distribution";
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	// Seeded system category "Rozrywka" (V2_1), shared by all users.
	private static final long SYSTEM_EXPENSE_CATEGORY_ID = 2L;

	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	private final MockMvcTester mvc;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity owner;
	private CategoryEntity incomeCategory;
	private CategoryEntity shoppingCategory;

	@Autowired
	GetCategoryDistributionIntegrationTest(UserRepository userRepository, CategoryRepository categoryRepository,
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
		shoppingCategory = saveCategory(owner, "Zakupy", TransactionType.EXPENSE);
	}

	@Test
	void shouldSumAmountPlnPerCategoryAndIgnoreIncome() {
		CategoryEntity bills = saveCategory(owner, "Opłaty", TransactionType.EXPENSE);
		saveTransaction(owner, shoppingCategory, "200.00", LocalDate.of(2026, 11, 2), TransactionType.EXPENSE);
		// A foreign currency: only amount_pln (430.00) may be summed, never the original amount (100.00).
		transactionRepository.saveAndFlush(new TransactionEntity(owner.getId(), shoppingCategory,
				new BigDecimal("100.00"), SupportedCurrency.EUR, new BigDecimal("430.00"), new BigDecimal("4.3000"),
				LocalDate.of(2026, 11, 5), null, TransactionType.EXPENSE, Instant.now(NOVEMBER_CLOCK)));
		saveTransaction(owner, bills, "370.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);
		saveTransaction(owner, incomeCategory, "5000.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);

		CategoryDistributionResponse result = distribution("2026-11-01", "2026-11-30");

		assertThat(result.totalExpenses()).isEqualTo(new BigDecimal("1000.00"));
		assertThat(result.categories()).containsExactly(
				share(shoppingCategory, "630.00", "63.00"),
				share(bills, "370.00", "37.00"));
	}

	@Test
	void shouldIncludeBothBoundaryDaysAndExcludeNeighbouringDays() {
		saveTransaction(owner, shoppingCategory, "1.00", LocalDate.of(2026, 9, 30), TransactionType.EXPENSE);
		saveTransaction(owner, shoppingCategory, "10.00", LocalDate.of(2026, 10, 1), TransactionType.EXPENSE);
		saveTransaction(owner, shoppingCategory, "20.00", LocalDate.of(2026, 10, 31), TransactionType.EXPENSE);
		saveTransaction(owner, shoppingCategory, "2.00", LocalDate.of(2026, 11, 1), TransactionType.EXPENSE);

		CategoryDistributionResponse result = distribution("2026-10-01", "2026-10-31");

		assertThat(result.totalExpenses()).isEqualTo(new BigDecimal("30.00"));
		assertThat(result.categories()).containsExactly(share(shoppingCategory, "30.00", "100.00"));
	}

	@Test
	void shouldExcludeOtherUsersExpensesInSharedSystemCategory() {
		CategoryEntity systemCategory = categoryRepository.findById(SYSTEM_EXPENSE_CATEGORY_ID).orElseThrow();
		UserEntity other = saveUser("other@example.com");
		saveTransaction(owner, systemCategory, "100.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);
		saveTransaction(other, systemCategory, "5000.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);

		CategoryDistributionResponse result = distribution("2026-11-01", "2026-11-30");

		assertThat(result.totalExpenses()).isEqualTo(new BigDecimal("100.00"));
		assertThat(result.categories()).containsExactly(share(systemCategory, "100.00", "100.00"));
	}

	@Test
	void shouldReturnZeroTotalAndEmptyListWhenThereAreOnlyIncomes() {
		saveTransaction(owner, incomeCategory, "5000.00", LocalDate.of(2026, 11, 10), TransactionType.INCOME);

		CategoryDistributionResponse result = distribution(null, null);

		assertThat(result).isEqualTo(new CategoryDistributionResponse(
				LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), new BigDecimal("0.00"), List.of()));
	}

	@Test
	void shouldReturnCurrentMonthDistributionOfAuthenticatedUserThroughHttp() {
		// The real Clock bean: the transaction is dated today in Warsaw, so the result does not depend on the run date.
		LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		saveTransaction(owner, shoppingCategory, "250.00", today, TransactionType.EXPENSE);
		UserEntity other = saveUser("other@example.com");
		saveTransaction(other, saveCategory(other, "Zakupy", TransactionType.EXPENSE), "999.00", today,
				TransactionType.EXPENSE);

		MvcTestResult result = getDistribution("");

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.dateFrom")
				.isEqualTo(YearMonth.from(today).atDay(1).toString());
		assertThat(result).bodyJson().extractingPath("$.dateTo")
				.isEqualTo(YearMonth.from(today).atEndOfMonth().toString());
		assertThat(result).bodyJson().extractingPath("$.totalExpenses").isEqualTo(250.0);
		assertThat(result).bodyJson().extractingPath("$.categories.length()").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$.categories[0].percentage").isEqualTo(100.0);
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"?dateFrom=2026-01-01                   | dateTo",
			"?dateFrom=abc&dateTo=2026-01-31        | dateFrom",
			"?dateFrom=2026-02-01&dateTo=2026-01-31 | dateFrom"
	})
	void shouldReturn400WithFieldErrorsThroughHttp(String queryString, String field) {
		MvcTestResult result = getDistribution(queryString);

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo(field);
	}

	private MvcTestResult getDistribution(String queryString) {
		return mvc.get().uri(DISTRIBUTION_URI + queryString)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(owner))
				.exchange();
	}

	private CategoryDistributionResponse distribution(String dateFrom, String dateTo) {
		return new GetCategoryDistributionUseCase(transactionRepository, NOVEMBER_CLOCK)
				.execute(owner.getId(), new GetCategoryDistributionQuery(dateFrom, dateTo));
	}

	private static CategoryShareResponse share(CategoryEntity category, String amount, String percentage) {
		return new CategoryShareResponse(
				category.getId(), category.getName(), new BigDecimal(amount), new BigDecimal(percentage));
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
