package pl.saldo.analytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

// Scenario test: transactions go in through the API (amount_pln is computed by the application, not by the test)
// and the analytics endpoints must reflect every create, edit and delete.
// Aggregation edge cases (month boundaries, zero months, other users) are covered by GetMonthlyBalanceIntegrationTest.
// Amounts are always positive; the type (INCOME or EXPENSE) decides on which side of the balance they are summed.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class AnalyticsFlowIntegrationTest {

	private static final String TRANSACTIONS_URI = "/api/v1/transactions";
	private static final String BALANCE_URI = "/api/v1/analytics/monthly-balance?months=2";
	private static final String DISTRIBUTION_URI = "/api/v1/analytics/category-distribution";
	private static final BigDecimal EUR_RATE = new BigDecimal("4.3217");

	@MockitoBean(name = "exchangeRateProvider")
	private ExchangeRateProvider exchangeRateProvider;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private String token;
	private YearMonth previousMonth;
	private YearMonth currentMonth;
	private LocalDate previousDate;
	private long salaryCategoryId;
	private long concertsCategoryId;
	private long souvenirsCategoryId;
	private UUID concertsExpenseId;
	private UUID euroExpenseId;

	@Autowired
	AnalyticsFlowIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, JwtService jwtService, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	// Previous month: income 1000.00, expenses 1200.50 + 10.10 EUR (43.65 PLN) = 1244.15, so expenses exceed income.
	// Current month: income 3000.00, expenses 200.25.
	@BeforeEach
	void setUp() {
		LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		currentMonth = YearMonth.from(today);
		previousMonth = currentMonth.minusMonths(1);
		previousDate = previousMonth.atDay(10);
		// A mock does not run the default method of the interface, so the PLN shortcut has to be stubbed.
		given(exchangeRateProvider.getRate(eq(SupportedCurrency.PLN), any())).willReturn(BigDecimal.ONE);
		given(exchangeRateProvider.getRate(SupportedCurrency.EUR, previousDate)).willReturn(EUR_RATE);

		UserEntity user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		token = jwtService.generateToken(user);
		salaryCategoryId = saveCategory(user, "Zlecenia", TransactionType.INCOME);
		concertsCategoryId = saveCategory(user, "Koncerty", TransactionType.EXPENSE);
		souvenirsCategoryId = saveCategory(user, "Pamiątki", TransactionType.EXPENSE);

		create("1000.00", SupportedCurrency.PLN, salaryCategoryId, previousDate, TransactionType.INCOME);
		concertsExpenseId = create(
				"1200.50", SupportedCurrency.PLN, concertsCategoryId, previousDate, TransactionType.EXPENSE);
		euroExpenseId = create(
				"10.10", SupportedCurrency.EUR, souvenirsCategoryId, previousDate, TransactionType.EXPENSE);
		create("3000.00", SupportedCurrency.PLN, salaryCategoryId, today, TransactionType.INCOME);
		create("200.25", SupportedCurrency.PLN, concertsCategoryId, today, TransactionType.EXPENSE);
	}

	@Test
	void shouldSumTransactionsCreatedThroughApiByMonthAndType() {
		String balance = get(BALANCE_URI);

		assertThat(JsonPath.<Integer>read(balance, "$.length()")).isEqualTo(2);
		assertMonth(balance, 0, previousMonth, "1000.00", "1244.15");
		assertMonth(balance, 1, currentMonth, "3000.00", "200.25");
	}

	@Test
	void shouldReportSameExpensesInBalanceAndCategoryDistribution() {
		String balance = get(BALANCE_URI);
		String distribution = getPreviousMonthDistribution();

		assertThat(decimal(distribution, "$.totalExpenses"))
				.isEqualByComparingTo(decimal(balance, "$[0].expenses"))
				.isEqualByComparingTo("1244.15");
		assertThat(JsonPath.<Integer>read(distribution, "$.categories.length()")).isEqualTo(2);
		assertCategory(distribution, 0, "Koncerty", "1200.50");
		assertCategory(distribution, 1, "Pamiątki", "43.65");
	}

	@Test
	void shouldRecalculateBalanceAfterEditingForeignCurrencyAmount() {
		update(euroExpenseId, "20.20", SupportedCurrency.EUR, souvenirsCategoryId, TransactionType.EXPENSE);

		String balance = get(BALANCE_URI);

		assertMonth(balance, 0, previousMonth, "1000.00", "1287.80");
		assertMonth(balance, 1, currentMonth, "3000.00", "200.25");
		assertThat(decimal(getPreviousMonthDistribution(), "$.totalExpenses")).isEqualByComparingTo("1287.80");
	}

	@Test
	void shouldMoveAmountFromExpensesToIncomeAfterChangingType() {
		update(concertsExpenseId, "1200.50", SupportedCurrency.PLN, salaryCategoryId, TransactionType.INCOME);

		String balance = get(BALANCE_URI);

		assertMonth(balance, 0, previousMonth, "2200.50", "43.65");
		assertMonth(balance, 1, currentMonth, "3000.00", "200.25");
		assertThat(decimal(getPreviousMonthDistribution(), "$.totalExpenses")).isEqualByComparingTo("43.65");
	}

	@Test
	void shouldRemoveDeletedTransactionFromBalanceAndDistribution() {
		MvcTestResult deleted = mvc.delete().uri(TRANSACTIONS_URI + "/" + concertsExpenseId)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();
		assertThat(deleted).hasStatus(HttpStatus.NO_CONTENT);

		String balance = get(BALANCE_URI);
		String distribution = getPreviousMonthDistribution();

		assertMonth(balance, 0, previousMonth, "1000.00", "43.65");
		assertMonth(balance, 1, currentMonth, "3000.00", "200.25");
		assertThat(decimal(distribution, "$.totalExpenses")).isEqualByComparingTo("43.65");
		assertThat(JsonPath.<Integer>read(distribution, "$.categories.length()")).isEqualTo(1);
		assertCategory(distribution, 0, "Pamiątki", "43.65");
	}

	private long saveCategory(UserEntity user, String name, TransactionType type) {
		return categoryRepository.saveAndFlush(new CategoryEntity(user.getId(), name, null, type)).getId();
	}

	private UUID create(String amount, SupportedCurrency currency, long categoryId, LocalDate date,
			TransactionType type) {
		MvcTestResult result = mvc.post().uri(TRANSACTIONS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content(transactionJson(amount, currency, categoryId, date, type))
				.exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
		return UUID.fromString(JsonPath.<String>read(responseBody(result), "$.id"));
	}

	// All edited transactions belong to the previous month and keep their date.
	private void update(UUID id, String amount, SupportedCurrency currency, long categoryId, TransactionType type) {
		MvcTestResult result = mvc.put().uri(TRANSACTIONS_URI + "/" + id)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content(transactionJson(amount, currency, categoryId, previousDate, type))
				.exchange();
		assertThat(result).hasStatus(HttpStatus.OK);
	}

	private String get(String uri) {
		MvcTestResult result = mvc.get().uri(uri)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();
		assertThat(result).hasStatus(HttpStatus.OK);
		return responseBody(result);
	}

	private String getPreviousMonthDistribution() {
		return get(DISTRIBUTION_URI + "?dateFrom=" + previousMonth.atDay(1) + "&dateTo=" + previousMonth.atEndOfMonth());
	}

	private static String transactionJson(String amount, SupportedCurrency currency, long categoryId, LocalDate date,
			TransactionType type) {
		return """
				{"amount": %s, "currency": "%s", "categoryId": %d, "date": "%s", "type": "%s"}"""
				.formatted(amount, currency, categoryId, date, type);
	}

	private static void assertMonth(String balance, int index, YearMonth month, String income, String expenses) {
		String path = "$[" + index + "]";
		assertThat(JsonPath.<String>read(balance, path + ".month")).isEqualTo(month.toString());
		assertThat(decimal(balance, path + ".income")).isEqualByComparingTo(income);
		assertThat(decimal(balance, path + ".expenses")).isEqualByComparingTo(expenses);
	}

	private static void assertCategory(String distribution, int index, String name, String amount) {
		String path = "$.categories[" + index + "]";
		assertThat(JsonPath.<String>read(distribution, path + ".categoryName")).isEqualTo(name);
		assertThat(decimal(distribution, path + ".amount")).isEqualByComparingTo(amount);
	}

	private static BigDecimal decimal(String body, String path) {
		Number value = JsonPath.read(body, path);
		return new BigDecimal(value.toString());
	}

	private static String responseBody(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		} catch (UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

}
