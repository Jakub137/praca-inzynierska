package pl.saldo.budget.api;

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
import org.springframework.data.domain.Sort;
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
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class GetBudgetUsageIntegrationTest {

	private static final String USAGE_URI = "/api/v1/budget-limits/usage";
	private static final String NOVEMBER_2026 = "?month=11&year=2026";
	private static final int MONTH = 11;
	private static final int YEAR = 2026;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final BudgetLimitRepository budgetLimitRepository;
	private final TransactionRepository transactionRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity owner;
	private UserEntity other;
	private String ownerToken;

	@Autowired
	GetBudgetUsageIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, BudgetLimitRepository budgetLimitRepository,
			TransactionRepository transactionRepository, JwtService jwtService, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.budgetLimitRepository = budgetLimitRepository;
		this.transactionRepository = transactionRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		owner = saveUser("owner@example.com");
		other = saveUser("other@example.com");
		ownerToken = jwtService.generateToken(owner);
	}

	@Test
	void shouldShowZeroSpentAndNormalStatusForLimitWithoutExpenses() {
		CategoryEntity category = saveCategory(owner, "Rozrywka");
		saveLimit(owner, category, MONTH, YEAR, "1500.00");

		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.length()").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$[0].categoryId").isEqualTo(category.getId().intValue());
		assertThat(result).bodyJson().extractingPath("$[0].categoryName").isEqualTo("Rozrywka");
		assertThat(result).bodyJson().extractingPath("$[0].limitAmount").isEqualTo(1500.0);
		assertThat(result).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(0.0);
		assertThat(result).bodyJson().extractingPath("$[0].percentage").isEqualTo(0.0);
		assertThat(result).bodyJson().extractingPath("$[0].status").isEqualTo("NORMAL");
	}

	@Test
	void shouldSumOnlyExpensesDatedInsideTheRequestedMonth() {
		CategoryEntity category = saveCategory(owner, "Rozrywka");
		saveLimit(owner, category, MONTH, YEAR, "1000.00");
		saveTransaction(owner, category, "50.00", LocalDate.of(2026, 10, 31), TransactionType.EXPENSE);
		saveTransaction(owner, category, "100.00", LocalDate.of(2026, 11, 1), TransactionType.EXPENSE);
		saveTransaction(owner, category, "200.00", LocalDate.of(2026, 11, 30), TransactionType.EXPENSE);
		saveTransaction(owner, category, "400.00", LocalDate.of(2026, 12, 1), TransactionType.EXPENSE);
		// The database does not tie the transaction type to the category type: only the type filter excludes this row.
		saveTransaction(owner, category, "999.00", LocalDate.of(2026, 11, 15), TransactionType.INCOME);

		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(300.0);
		assertThat(result).bodyJson().extractingPath("$[0].percentage").isEqualTo(30.0);
		assertThat(result).bodyJson().extractingPath("$[0].status").isEqualTo("NORMAL");
	}

	@Test
	void shouldCountPlnAmountOfForeignCurrencyExpense() {
		CategoryEntity category = saveCategory(owner, "Podróże");
		saveLimit(owner, category, MONTH, YEAR, "100.00");
		transactionRepository.saveAndFlush(new TransactionEntity(
				owner.getId(), category, new BigDecimal("10.00"), SupportedCurrency.EUR, new BigDecimal("43.00"),
				new BigDecimal("4.3000"), LocalDate.of(2026, 11, 10), null, TransactionType.EXPENSE,
				Instant.now(clock)));

		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(43.0);
	}

	@Test
	void shouldNotCountOtherUsersSpendingInTheSameSystemCategory() {
		CategoryEntity shared = systemExpenseCategory();
		saveLimit(owner, shared, MONTH, YEAR, "1000.00");
		saveLimit(other, shared, MONTH, YEAR, "2000.00");
		saveTransaction(owner, shared, "100.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);
		saveTransaction(other, shared, "500.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);

		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).bodyJson().extractingPath("$.length()").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$[0].limitAmount").isEqualTo(1000.0);
		assertThat(result).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(100.0);
	}

	@Test
	void shouldReturnOnlyLimitsOfTheRequestedMonth() {
		CategoryEntity october = saveCategory(owner, "Październik");
		CategoryEntity november = saveCategory(owner, "Listopad");
		saveLimit(owner, october, 10, YEAR, "100.00");
		saveLimit(owner, november, MONTH, YEAR, "200.00");

		MvcTestResult novemberResult = getUsage(NOVEMBER_2026);
		MvcTestResult octoberResult = getUsage("?month=10&year=2026");

		assertThat(novemberResult).bodyJson().extractingPath("$[*].categoryName").isEqualTo(List.of("Listopad"));
		assertThat(octoberResult).bodyJson().extractingPath("$[*].categoryName").isEqualTo(List.of("Październik"));
	}

	@Test
	void shouldComputeStatusFromExactAmountsAtThresholds() {
		CategoryEntity almostWarning = saveCategory(owner, "A bliska ostrzeżenia");
		CategoryEntity warning = saveCategory(owner, "B ostrzeżenie");
		CategoryEntity exceeded = saveCategory(owner, "C przekroczony");
		saveLimit(owner, almostWarning, MONTH, YEAR, "1000.00");
		saveLimit(owner, warning, MONTH, YEAR, "1000.00");
		saveLimit(owner, exceeded, MONTH, YEAR, "1000.00");
		saveTransaction(owner, almostWarning, "799.99", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);
		saveTransaction(owner, warning, "800.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);
		saveTransaction(owner, exceeded, "1000.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE);

		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).bodyJson().extractingPath("$[*].status")
				.isEqualTo(List.of("NORMAL", "WARNING", "EXCEEDED"));
		assertThat(result).bodyJson().extractingPath("$[0].percentage").isEqualTo(80.0);
		assertThat(result).bodyJson().extractingPath("$[1].percentage").isEqualTo(80.0);
		assertThat(result).bodyJson().extractingPath("$[2].percentage").isEqualTo(100.0);
	}

	@Test
	void shouldOrderCategoriesByPolishCollation() {
		for (String name : List.of("Żabka", "Ćwiczenia", "Zakupy", "Czynsz")) {
			saveLimit(owner, saveCategory(owner, name), MONTH, YEAR, "100.00");
		}

		MvcTestResult result = getUsage(NOVEMBER_2026);

		// Binary order would put "Ćwiczenia" and "Żabka" after "Zakupy" in a different sequence.
		assertThat(result).bodyJson().extractingPath("$[*].categoryName")
				.isEqualTo(List.of("Czynsz", "Ćwiczenia", "Zakupy", "Żabka"));
	}

	@Test
	void shouldReturnEmptyListWhenNoLimitsAreSet() {
		MvcTestResult result = getUsage(NOVEMBER_2026);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyText().isEqualTo("[]");
	}

	@Test
	void shouldReturn400WithFieldErrorWhenOnlyMonthIsGiven() {
		MvcTestResult result = getUsage("?month=11");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("year");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Rok jest wymagany, gdy podano miesiąc");
	}

	@Test
	void shouldReturn401WithoutToken() {
		MvcTestResult result = mvc.get().uri(USAGE_URI + NOVEMBER_2026).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
	}

	private MvcTestResult getUsage(String query) {
		return mvc.get().uri(USAGE_URI + query)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
				.exchange();
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(new UserEntity(
				email, "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, Instant.now(clock)));
	}

	private CategoryEntity systemExpenseCategory() {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(owner.getId(), Sort.by("id")).stream()
				.filter(category -> category.isDefault() && category.getType() == TransactionType.EXPENSE)
				.findFirst()
				.orElseThrow();
	}

	private CategoryEntity saveCategory(UserEntity user, String name) {
		return categoryRepository.saveAndFlush(new CategoryEntity(user.getId(), name, null, TransactionType.EXPENSE));
	}

	private void saveLimit(UserEntity user, CategoryEntity category, int month, int year, String amount) {
		budgetLimitRepository.saveAndFlush(new BudgetLimitEntity(
				user.getId(), category.getId(), month, year, new BigDecimal(amount), Instant.now(clock)));
	}

	private void saveTransaction(UserEntity user, CategoryEntity category, String amountPln, LocalDate date,
			TransactionType type) {
		BigDecimal amount = new BigDecimal(amountPln);
		transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, amount, SupportedCurrency.PLN, amount, new BigDecimal("1.0000"), date, null,
				type, Instant.now(clock)));
	}

}
