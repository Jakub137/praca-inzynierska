package pl.saldo.transaction.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import com.jayway.jsonpath.JsonPath;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.transaction.usecase.PlnConversion;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

// Deliberately NOT @Transactional: the update use case runs without a transaction, so the merge of a detached
// entity and the lazy category load can only be verified when every request commits for real (T-038 commitment).
// Each test removes the users it created; ON DELETE CASCADE removes their transactions and own categories.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TransactionIntegrationTest {

	private static final String TRANSACTIONS_URI = "/api/v1/transactions";
	private static final String PASSWORD = "Secret#123";
	private static final LocalDate DATE = LocalDate.of(2026, 11, 10);
	private static final String EUR_RATE = "4.3217";
	private static final String PLN_RATE = "1.0000";
	private static final int SYSTEM_CATEGORY_COUNT = 11;
	private static final int EXPENSE_ROWS = 25;
	private static final int INCOME_ROWS = 3;
	private static final int TOTAL_ROWS = EXPENSE_ROWS + INCOME_ROWS;
	private static final int PAGE_SIZE = 10;

	// Replaces the @Primary composite bean by name; the fallback chain is covered by T-036, not here.
	@MockitoBean(name = "exchangeRateProvider")
	ExchangeRateProvider exchangeRateProvider;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	private final JwtService jwtService;
	private final PasswordEncoder passwordEncoder;
	private final JdbcTemplate jdbcTemplate;
	private final Clock clock;
	private final PlnConversion plnConversion;
	private final List<UUID> createdUserIds = new ArrayList<>();

	@Autowired
	TransactionIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, TransactionRepository transactionRepository,
			JwtService jwtService, PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate, Clock clock,
			PlnConversion plnConversion) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.transactionRepository = transactionRepository;
		this.jwtService = jwtService;
		this.passwordEncoder = passwordEncoder;
		this.jdbcTemplate = jdbcTemplate;
		this.clock = clock;
		this.plnConversion = plnConversion;
	}

	// A mock does not run the default method of the interface, so the PLN shortcut has to be stubbed.
	@BeforeEach
	void stubPlnRate() {
		when(exchangeRateProvider.getRate(eq(SupportedCurrency.PLN), any())).thenReturn(BigDecimal.ONE);
	}

	@AfterEach
	void deleteCreatedUsers() {
		createdUserIds.forEach(id -> jdbcTemplate.update("DELETE FROM users WHERE id = ?", id));
		Integer systemCategories = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM categories WHERE user_id IS NULL", Integer.class);
		assertThat(systemCategories).isEqualTo(SYSTEM_CATEGORY_COUNT);
	}

	@Test
	void shouldWireMockedProviderIntoPlnConversion() {
		Object wired = ReflectionTestUtils.getField(plnConversion, "exchangeRateProvider");

		assertThat(mockingDetails(wired).isMock()).isTrue();
	}

	@Nested
	class CreateTransaction {

		@Test
		void shouldSaveEurAmountRateAndConvertedPln() {
			UserEntity user = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			when(exchangeRateProvider.getRate(SupportedCurrency.EUR, DATE)).thenReturn(new BigDecimal(EUR_RATE));

			MvcTestResult result = post(user, transactionJson(
					"123.45", SupportedCurrency.EUR, category.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.CREATED);
			String body = body(result);
			UUID id = UUID.fromString(JsonPath.<String>read(body, "$.id"));
			assertThat(result.getResponse().getHeader(HttpHeaders.LOCATION)).endsWith(TRANSACTIONS_URI + "/" + id);
			assertThat(decimal(body, "$.amount")).isEqualByComparingTo("123.45");
			assertThat(result).bodyJson().extractingPath("$.currency").isEqualTo("EUR");
			assertThat(decimal(body, "$.exchangeRate")).isEqualByComparingTo(EUR_RATE);
			assertThat(decimal(body, "$.amountPln")).isEqualByComparingTo("533.51");
			TransactionEntity saved = transactionRepository.findById(id).orElseThrow();
			assertThat(saved.getUserId()).isEqualTo(user.getId());
			assertThat(saved.getCurrency()).isEqualTo(SupportedCurrency.EUR);
			assertThat(saved.getAmount()).isEqualByComparingTo("123.45");
			assertThat(saved.getExchangeRate()).isEqualByComparingTo(EUR_RATE);
			assertThat(saved.getAmountPln()).isEqualByComparingTo("533.51");
			verify(exchangeRateProvider).getRate(SupportedCurrency.EUR, DATE);
		}

		@Test
		void shouldSavePlnAmountWithRateOne() {
			UserEntity user = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);

			MvcTestResult result = post(user, transactionJson(
					"250.00", SupportedCurrency.PLN, category.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.CREATED);
			String body = body(result);
			UUID id = UUID.fromString(JsonPath.<String>read(body, "$.id"));
			assertThat(decimal(body, "$.exchangeRate")).isEqualByComparingTo(PLN_RATE);
			assertThat(decimal(body, "$.amountPln")).isEqualByComparingTo("250.00");
			TransactionEntity saved = transactionRepository.findById(id).orElseThrow();
			assertThat(saved.getExchangeRate()).isEqualByComparingTo(PLN_RATE);
			assertThat(saved.getAmountPln()).isEqualByComparingTo("250.00");
		}

		@Test
		void shouldReturn503AndSaveNothingWhenRateIsUnavailable() {
			UserEntity user = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			when(exchangeRateProvider.getRate(SupportedCurrency.EUR, DATE))
					.thenThrow(new ExchangeRateUnavailableException("NBP unavailable"));

			MvcTestResult result = post(user, transactionJson(
					"10.00", SupportedCurrency.EUR, category.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.SERVICE_UNAVAILABLE);
			assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo(
					"Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.");
			Integer saved = jdbcTemplate.queryForObject(
					"SELECT count(*) FROM transactions WHERE user_id = ?", Integer.class, user.getId());
			assertThat(saved).isZero();
		}

		@Test
		void shouldReturn401WithoutToken() {
			MvcTestResult result = mvc.post().uri(TRANSACTIONS_URI)
					.contentType(MediaType.APPLICATION_JSON)
					.content(transactionJson("10.00", SupportedCurrency.PLN, 1L, DATE, TransactionType.EXPENSE))
					.exchange();

			assertUnauthorized(result);
		}

		@Test
		void shouldReturn404ForCategoryOwnedByAnotherUser() {
			UserEntity user = createUser();
			UserEntity other = createUser();
			CategoryEntity foreign = categoryRepository.saveAndFlush(
					new CategoryEntity(other.getId(), "Cudza kategoria", "tag", TransactionType.EXPENSE));

			MvcTestResult result = post(user, transactionJson(
					"10.00", SupportedCurrency.PLN, foreign.getId(), DATE, TransactionType.EXPENSE));

			assertNotFound(result);
			Integer saved = jdbcTemplate.queryForObject(
					"SELECT count(*) FROM transactions WHERE user_id = ?", Integer.class, user.getId());
			assertThat(saved).isZero();
		}

	}

	@Nested
	class UpdateTransaction {

		@Test
		void shouldKeepOwnerCreationTimeAndRecurringFlagAndReturnCategoryName() {
			UserEntity user = createUser();
			CategoryEntity oldCategory = systemCategory(TransactionType.EXPENSE, 0);
			CategoryEntity newCategory = systemCategory(TransactionType.EXPENSE, 1);
			TransactionEntity original = saveTransaction(user.getId(), oldCategory, "100.00",
					SupportedCurrency.EUR, EUR_RATE, DATE, TransactionType.EXPENSE);
			// The entity has no way to become recurring yet (T-062), so the flag is set directly in the database.
			jdbcTemplate.update("UPDATE transactions SET is_recurring = TRUE WHERE id = ?", original.getId());
			TransactionEntity before = transactionRepository.findById(original.getId()).orElseThrow();

			MvcTestResult result = put(original.getId(), user, transactionJson(
					"50.00", SupportedCurrency.EUR, newCategory.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.OK);
			assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo(newCategory.getName());
			assertThat(result).bodyJson().extractingPath("$.recurring").isEqualTo(true);
			TransactionEntity after = transactionRepository.findById(original.getId()).orElseThrow();
			assertThat(after.getUserId()).isEqualTo(user.getId());
			assertThat(after.getCreatedAt()).isEqualTo(before.getCreatedAt());
			assertThat(after.isRecurring()).isTrue();
			assertThat(after.getAmount()).isEqualByComparingTo("50.00");
		}

		@Test
		void shouldNotCallRateProviderWhenOnlyAmountChanges() {
			UserEntity user = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			TransactionEntity original = saveTransaction(user.getId(), category, "100.00",
					SupportedCurrency.EUR, EUR_RATE, DATE, TransactionType.EXPENSE);

			MvcTestResult result = put(original.getId(), user, transactionJson(
					"200.00", SupportedCurrency.EUR, category.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.OK);
			String body = body(result);
			assertThat(decimal(body, "$.exchangeRate")).isEqualByComparingTo(EUR_RATE);
			assertThat(decimal(body, "$.amountPln")).isEqualByComparingTo("864.34");
			verify(exchangeRateProvider, never()).getRate(any(), any());
		}

		@Test
		void shouldFetchNewRateWhenCurrencyChanges() {
			UserEntity user = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			TransactionEntity original = saveTransaction(user.getId(), category, "100.00",
					SupportedCurrency.EUR, EUR_RATE, DATE, TransactionType.EXPENSE);
			when(exchangeRateProvider.getRate(SupportedCurrency.USD, DATE)).thenReturn(new BigDecimal("3.9500"));

			MvcTestResult result = put(original.getId(), user, transactionJson(
					"100.00", SupportedCurrency.USD, category.getId(), DATE, TransactionType.EXPENSE));

			assertThat(result).hasStatus(HttpStatus.OK);
			String body = body(result);
			assertThat(result).bodyJson().extractingPath("$.currency").isEqualTo("USD");
			assertThat(decimal(body, "$.exchangeRate")).isEqualByComparingTo("3.9500");
			assertThat(decimal(body, "$.amountPln")).isEqualByComparingTo("395.00");
			verify(exchangeRateProvider).getRate(SupportedCurrency.USD, DATE);
			TransactionEntity saved = transactionRepository.findById(original.getId()).orElseThrow();
			assertThat(saved.getCurrency()).isEqualTo(SupportedCurrency.USD);
			assertThat(saved.getAmountPln()).isEqualByComparingTo("395.00");
		}

	}

	@Nested
	class Ownership {

		@Test
		void shouldReturn404WhenReadingTransactionOfAnotherUser() {
			UserEntity owner = createUser();
			UserEntity intruder = createUser();
			TransactionEntity transaction = saveTransaction(owner.getId(), systemCategory(TransactionType.EXPENSE, 0),
					"100.00", SupportedCurrency.PLN, PLN_RATE, DATE, TransactionType.EXPENSE);

			MvcTestResult result = get(TRANSACTIONS_URI + "/" + transaction.getId(), intruder);

			assertNotFound(result);
		}

		@Test
		void shouldReturn404AndKeepDataWhenUpdatingTransactionOfAnotherUser() {
			UserEntity owner = createUser();
			UserEntity intruder = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			TransactionEntity transaction = saveTransaction(owner.getId(), category, "100.00",
					SupportedCurrency.PLN, PLN_RATE, DATE, TransactionType.EXPENSE);

			MvcTestResult result = put(transaction.getId(), intruder, transactionJson(
					"999.00", SupportedCurrency.PLN, category.getId(), DATE, TransactionType.EXPENSE));

			assertNotFound(result);
			TransactionEntity unchanged = transactionRepository.findById(transaction.getId()).orElseThrow();
			assertThat(unchanged.getAmount()).isEqualByComparingTo("100.00");
		}

		@Test
		void shouldReturn404AndKeepRowWhenDeletingTransactionOfAnotherUser() {
			UserEntity owner = createUser();
			UserEntity intruder = createUser();
			TransactionEntity transaction = saveTransaction(owner.getId(), systemCategory(TransactionType.EXPENSE, 0),
					"100.00", SupportedCurrency.PLN, PLN_RATE, DATE, TransactionType.EXPENSE);

			MvcTestResult result = delete(transaction.getId(), intruder);

			assertNotFound(result);
			assertThat(transactionRepository.existsById(transaction.getId())).isTrue();
		}

		@Test
		void shouldNotListTransactionsOfAnotherUser() {
			UserEntity owner = createUser();
			UserEntity other = createUser();
			CategoryEntity category = systemCategory(TransactionType.EXPENSE, 0);
			saveTransaction(owner.getId(), category, "10.00", SupportedCurrency.PLN, PLN_RATE, DATE,
					TransactionType.EXPENSE);
			saveTransaction(owner.getId(), category, "20.00", SupportedCurrency.PLN, PLN_RATE, DATE,
					TransactionType.EXPENSE);
			TransactionEntity foreign = saveTransaction(other.getId(), category, "30.00", SupportedCurrency.PLN,
					PLN_RATE, DATE, TransactionType.EXPENSE);

			String body = listBody(owner, "");

			assertThat(JsonPath.<Integer>read(body, "$.totalElements")).isEqualTo(2);
			assertThat(JsonPath.<List<String>>read(body, "$.content[*].id"))
					.doesNotContain(foreign.getId().toString());
		}

		@Test
		void shouldDeleteOwnTransactionAndThenReturn404() {
			UserEntity owner = createUser();
			TransactionEntity transaction = saveTransaction(owner.getId(), systemCategory(TransactionType.EXPENSE, 0),
					"100.00", SupportedCurrency.PLN, PLN_RATE, DATE, TransactionType.EXPENSE);

			MvcTestResult deleted = delete(transaction.getId(), owner);

			assertThat(deleted).hasStatus(HttpStatus.NO_CONTENT);
			assertThat(transactionRepository.existsById(transaction.getId())).isFalse();
			assertNotFound(get(TRANSACTIONS_URI + "/" + transaction.getId(), owner));
		}

		@Test
		void shouldReturn401ForListWithoutToken() {
			assertUnauthorized(mvc.get().uri(TRANSACTIONS_URI).exchange());
		}

	}

	@Nested
	class Pagination {

		@Test
		void shouldReturnMetadataOfFirstPage() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user, "size=" + PAGE_SIZE + "&page=0");

			assertThat(JsonPath.<Integer>read(body, "$.totalElements")).isEqualTo(TOTAL_ROWS);
			assertThat(JsonPath.<Integer>read(body, "$.totalPages")).isEqualTo(3);
			assertThat(JsonPath.<Integer>read(body, "$.page")).isZero();
			assertThat(JsonPath.<Integer>read(body, "$.size")).isEqualTo(PAGE_SIZE);
			assertThat(JsonPath.<List<Object>>read(body, "$.content")).hasSize(PAGE_SIZE);
		}

		@Test
		void shouldReturnRemainingRowsOnLastPage() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user, "size=" + PAGE_SIZE + "&page=2");

			assertThat(JsonPath.<Integer>read(body, "$.page")).isEqualTo(2);
			assertThat(JsonPath.<List<Object>>read(body, "$.content")).hasSize(TOTAL_ROWS - 2 * PAGE_SIZE);
		}

		@Test
		void shouldUseDefaultPageSizeOfTwenty() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user, "");

			assertThat(JsonPath.<Integer>read(body, "$.size")).isEqualTo(20);
			assertThat(JsonPath.<Integer>read(body, "$.totalPages")).isEqualTo(2);
			assertThat(JsonPath.<List<Object>>read(body, "$.content")).hasSize(20);
		}

		@Test
		void shouldFilterByType() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user, "type=INCOME");

			assertThat(JsonPath.<Integer>read(body, "$.totalElements")).isEqualTo(INCOME_ROWS);
		}

		@Test
		void shouldFilterByCategory() {
			UserEntity user = createUser();
			seedPaginationData(user);
			CategoryEntity expenseCategory = systemCategory(TransactionType.EXPENSE, 0);

			String body = listBody(user, "categoryId=" + expenseCategory.getId());

			assertThat(JsonPath.<Integer>read(body, "$.totalElements")).isEqualTo(EXPENSE_ROWS);
		}

		@Test
		void shouldIncludeBoundaryDatesOfRange() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user,
					"type=EXPENSE&dateFrom=" + DATE.minusDays(4) + "&dateTo=" + DATE.minusDays(2));

			assertThat(JsonPath.<Integer>read(body, "$.totalElements")).isEqualTo(3);
		}

		@Test
		void shouldSortByAmountPlnAscending() {
			UserEntity user = createUser();
			seedPaginationData(user);

			String body = listBody(user, "type=EXPENSE&sortBy=amountPln&sortDirection=asc");

			assertThat(decimal(body, "$.content[0].amountPln")).isEqualByComparingTo("1.00");
		}

		@Test
		void shouldNotRepeatOrSkipRowsWhenSortValuesTie() {
			UserEntity user = createUser();
			seedPaginationData(user);
			List<String> ids = new ArrayList<>();

			for (int page = 0; page < 3; page++) {
				String body = listBody(user, "sortBy=amountPln&sortDirection=asc&size=" + PAGE_SIZE + "&page=" + page);
				ids.addAll(JsonPath.<List<String>>read(body, "$.content[*].id"));
			}

			assertThat(ids).hasSize(TOTAL_ROWS).doesNotHaveDuplicates();
		}

		@Test
		void shouldReturn400WithFieldErrorsForInvalidParameters() {
			UserEntity user = createUser();

			MvcTestResult result = get(TRANSACTIONS_URI + "?size=0&sortBy=price", user);

			assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
			assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
			assertThat(JsonPath.<List<String>>read(body(result), "$.fieldErrors[*].field"))
					.containsExactlyInAnyOrder("size", "sortBy");
		}

	}

	private UserEntity createUser() {
		UserEntity user = userRepository.saveAndFlush(new UserEntity(
				"user-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode(PASSWORD), "Jan", "Kowalski",
				SupportedCurrency.PLN, Instant.now(clock)));
		createdUserIds.add(user.getId());
		return user;
	}

	private CategoryEntity systemCategory(TransactionType type, int index) {
		return categoryRepository.findAll().stream()
				.filter(category -> category.getUserId() == null && category.getType() == type)
				.sorted(Comparator.comparing(CategoryEntity::getId))
				.toList()
				.get(index);
	}

	private TransactionEntity newTransaction(UUID userId, CategoryEntity category, String amount,
			SupportedCurrency currency, String rate, LocalDate date, TransactionType type) {
		BigDecimal amountPln = new BigDecimal(amount).multiply(new BigDecimal(rate))
				.setScale(2, RoundingMode.HALF_UP);
		return new TransactionEntity(userId, category, new BigDecimal(amount), currency, amountPln,
				new BigDecimal(rate), date, "Seed", type, Instant.now(clock));
	}

	private TransactionEntity saveTransaction(UUID userId, CategoryEntity category, String amount,
			SupportedCurrency currency, String rate, LocalDate date, TransactionType type) {
		return transactionRepository.save(newTransaction(userId, category, amount, currency, rate, date, type));
	}

	// 25 expenses (amounts repeat 1..5, dates one day apart) and 3 incomes, so sorting has many ties.
	private void seedPaginationData(UserEntity user) {
		CategoryEntity expenseCategory = systemCategory(TransactionType.EXPENSE, 0);
		CategoryEntity incomeCategory = systemCategory(TransactionType.INCOME, 0);
		List<TransactionEntity> rows = new ArrayList<>();
		for (int i = 0; i < EXPENSE_ROWS; i++) {
			rows.add(newTransaction(user.getId(), expenseCategory, (i % 5 + 1) + ".00", SupportedCurrency.PLN,
					PLN_RATE, DATE.minusDays(i), TransactionType.EXPENSE));
		}
		for (int i = 0; i < INCOME_ROWS; i++) {
			rows.add(newTransaction(user.getId(), incomeCategory, (1000 + i) + ".00", SupportedCurrency.PLN,
					PLN_RATE, DATE.minusDays(i), TransactionType.INCOME));
		}
		transactionRepository.saveAll(rows);
	}

	private static String transactionJson(String amount, SupportedCurrency currency, Long categoryId,
			LocalDate date, TransactionType type) {
		return """
				{"amount":%s,"currency":"%s","categoryId":%d,"date":"%s","description":"Test","type":"%s"}
				""".formatted(amount, currency, categoryId, date, type);
	}

	private String bearer(UserEntity user) {
		return "Bearer " + jwtService.generateToken(user);
	}

	private MvcTestResult get(String uri, UserEntity user) {
		return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(user)).exchange();
	}

	private MvcTestResult post(UserEntity user, String json) {
		return mvc.post().uri(TRANSACTIONS_URI)
				.header(HttpHeaders.AUTHORIZATION, bearer(user))
				.contentType(MediaType.APPLICATION_JSON)
				.content(json)
				.exchange();
	}

	private MvcTestResult put(UUID id, UserEntity user, String json) {
		return mvc.put().uri(TRANSACTIONS_URI + "/" + id)
				.header(HttpHeaders.AUTHORIZATION, bearer(user))
				.contentType(MediaType.APPLICATION_JSON)
				.content(json)
				.exchange();
	}

	private MvcTestResult delete(UUID id, UserEntity user) {
		return mvc.delete().uri(TRANSACTIONS_URI + "/" + id)
				.header(HttpHeaders.AUTHORIZATION, bearer(user))
				.exchange();
	}

	private String listBody(UserEntity user, String query) {
		MvcTestResult result = get(TRANSACTIONS_URI + "?" + query, user);
		assertThat(result).hasStatus(HttpStatus.OK);
		return body(result);
	}

	private static String body(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		} catch (java.io.UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

	private static BigDecimal decimal(String body, String path) {
		Number value = JsonPath.read(body, path);
		return new BigDecimal(value.toString());
	}

	private static void assertNotFound(MvcTestResult result) {
		assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
		assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("Żądany zasób nie istnieje.");
	}

	private static void assertUnauthorized(MvcTestResult result) {
		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Brak autoryzacji");
	}

}
