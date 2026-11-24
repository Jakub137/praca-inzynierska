package pl.saldo.ai.usecase;

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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.ai.domain.SpendingAnomaly;
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

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class GetDashboardInsightIntegrationTest {

	private static final String INSIGHT_URI = "/api/v1/ai/dashboard-insight";
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	private static final String ENTERTAINMENT = "Rozrywka";

	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	private final MockMvcTester mvc;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity owner;
	private GetDashboardInsightUseCase useCase;

	@Autowired
	GetDashboardInsightIntegrationTest(UserRepository userRepository, CategoryRepository categoryRepository,
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
		useCase = new GetDashboardInsightUseCase(transactionRepository, NOVEMBER_CLOCK);
	}

	@Test
	void shouldDetectAnomalyFromStoredExpenses() {
		CategoryEntity entertainment = saveCategory(owner, ENTERTAINMENT);
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 8, 15));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 9, 15));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 10, 15));
		saveExpense(owner, entertainment, "150.00", LocalDate.of(2026, 11, 10));

		assertThat(useCase.execute(owner.getId())).contains(anomaly(entertainment, 50, "150.00", "100.00"));
	}

	@Test
	void shouldIgnoreIncomeAndOtherUsersExpensesInTheSameSystemCategory() {
		CategoryEntity shared = systemExpenseCategory();
		UserEntity other = saveUser("other@example.com");
		saveExpense(owner, shared, "100.00", LocalDate.of(2026, 8, 15));
		saveExpense(owner, shared, "100.00", LocalDate.of(2026, 9, 15));
		saveExpense(owner, shared, "100.00", LocalDate.of(2026, 10, 15));
		saveExpense(owner, shared, "110.00", LocalDate.of(2026, 11, 10));
		saveExpense(other, shared, "900.00", LocalDate.of(2026, 11, 10));
		// The database does not tie the transaction type to the category type: only the type filter excludes this row.
		saveTransaction(owner, shared, "999.00", LocalDate.of(2026, 11, 12), TransactionType.INCOME);

		assertThat(useCase.execute(owner.getId())).isEmpty();
	}

	@Test
	void shouldCompareAmountsInPln() {
		CategoryEntity entertainment = saveCategory(owner, ENTERTAINMENT);
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 8, 15));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 9, 15));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 10, 15));
		transactionRepository.saveAndFlush(new TransactionEntity(
				owner.getId(), entertainment, new BigDecimal("50.00"), SupportedCurrency.EUR, new BigDecimal("215.00"),
				new BigDecimal("4.3000"), LocalDate.of(2026, 11, 10), null, TransactionType.EXPENSE,
				Instant.now(clock)));

		assertThat(useCase.execute(owner.getId())).contains(anomaly(entertainment, 115, "215.00", "100.00"));
	}

	@Test
	void shouldUseWholeCalendarMonthsAsWindowBoundaries() {
		CategoryEntity entertainment = saveCategory(owner, ENTERTAINMENT);
		// 31 Jul and 1 Dec lie outside the window [1 Aug, 1 Dec); 1 Aug and 31 Oct are inside it.
		saveExpense(owner, entertainment, "9999.00", LocalDate.of(2026, 7, 31));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 8, 1));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 9, 15));
		saveExpense(owner, entertainment, "100.00", LocalDate.of(2026, 10, 31));
		saveExpense(owner, entertainment, "140.00", LocalDate.of(2026, 11, 5));
		saveExpense(owner, entertainment, "5000.00", LocalDate.of(2026, 12, 1));

		assertThat(useCase.execute(owner.getId())).contains(anomaly(entertainment, 40, "140.00", "100.00"));
	}

	@Test
	void shouldReturnEmptyForUserWithoutExpenses() {
		assertThat(useCase.execute(owner.getId())).isEmpty();
	}

	@Test
	void shouldReturnInsightThroughHttpForAuthenticatedUser() {
		CategoryEntity entertainment = saveCategory(owner, ENTERTAINMENT);
		YearMonth currentMonth = YearMonth.now(clock.withZone(BusinessTime.ZONE));
		saveExpense(owner, entertainment, "100.00", currentMonth.minusMonths(3).atDay(15));
		saveExpense(owner, entertainment, "100.00", currentMonth.minusMonths(2).atDay(15));
		saveExpense(owner, entertainment, "100.00", currentMonth.minusMonths(1).atDay(15));
		saveExpense(owner, entertainment, "150.00", currentMonth.atDay(1));

		MvcTestResult result = mvc.get().uri(INSIGHT_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(owner))
				.exchange();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryId").isEqualTo(entertainment.getId().intValue());
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo(ENTERTAINMENT);
		assertThat(result).bodyJson().extractingPath("$.increasePercent").isEqualTo(50);
		assertThat(result).bodyJson().extractingPath("$.currentAmount").isEqualTo(150.0);
		assertThat(result).bodyJson().extractingPath("$.averageAmount").isEqualTo(100.0);
		assertThat(result).bodyJson().extractingPath("$.message")
				.isEqualTo("W kategorii Rozrywka wydałeś o 50% więcej niż średnio w ostatnich 3 miesiącach.");
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	private static SpendingAnomaly anomaly(CategoryEntity category, int percent, String current, String average) {
		return new SpendingAnomaly(
				category.getId(), category.getName(), percent, new BigDecimal(current), new BigDecimal(average));
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(new UserEntity(
				email, "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, Instant.now(clock)));
	}

	private CategoryEntity systemExpenseCategory() {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(owner.getId(), Sort.by(CategoryEntity::getId))
				.stream()
				.filter(category -> category.isDefault() && category.getType() == TransactionType.EXPENSE)
				.findFirst()
				.orElseThrow();
	}

	private CategoryEntity saveCategory(UserEntity user, String name) {
		return categoryRepository.saveAndFlush(new CategoryEntity(user.getId(), name, null, TransactionType.EXPENSE));
	}

	private void saveExpense(UserEntity user, CategoryEntity category, String amountPln, LocalDate date) {
		saveTransaction(user, category, amountPln, date, TransactionType.EXPENSE);
	}

	private void saveTransaction(UserEntity user, CategoryEntity category, String amountPln, LocalDate date,
			TransactionType type) {
		BigDecimal amount = new BigDecimal(amountPln);
		transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, amount, SupportedCurrency.PLN, amount, new BigDecimal("1.0000"), date, null,
				type, Instant.now(clock)));
	}

}
