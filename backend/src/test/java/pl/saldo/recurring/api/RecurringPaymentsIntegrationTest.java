package pl.saldo.recurring.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.domain.PaymentFrequency;
import pl.saldo.recurring.domain.RecurringPaymentDates;
import pl.saldo.recurring.domain.RecurringPaymentEntity;
import pl.saldo.recurring.infrastructure.RecurringPaymentRepository;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class RecurringPaymentsIntegrationTest {

	private static final String PAYMENTS_URI = "/api/v1/recurring-payments";
	private static final long MISSING_CATEGORY_ID = 999_999_999L;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final RecurringPaymentRepository recurringPaymentRepository;
	private final JwtService jwtService;
	private final Clock clock;
	private final EntityManager entityManager;

	private UserEntity user;
	private UserEntity otherUser;
	private CategoryEntity expenseCategory;
	private CategoryEntity incomeCategory;
	private String token;
	private LocalDate today;

	@Autowired
	RecurringPaymentsIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, RecurringPaymentRepository recurringPaymentRepository,
			JwtService jwtService, Clock clock, EntityManager entityManager) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.recurringPaymentRepository = recurringPaymentRepository;
		this.jwtService = jwtService;
		this.clock = clock;
		this.entityManager = entityManager;
	}

	@BeforeEach
	void setUp() {
		user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		otherUser = userRepository.saveAndFlush(new UserEntity(
				"anna.nowak@example.com", "stored-hash", "Anna", "Nowak", SupportedCurrency.PLN,
				Instant.now(clock)));
		List<CategoryEntity> systemCategories = categoryRepository
				.findAllByUserIdOrIsDefaultTrue(user.getId(), Sort.by("id")).stream()
				.filter(CategoryEntity::isDefault)
				.toList();
		expenseCategory = firstOfType(systemCategories, TransactionType.EXPENSE);
		incomeCategory = firstOfType(systemCategories, TransactionType.INCOME);
		token = jwtService.generateToken(user);
		today = RecurringPaymentDates.today(clock);
	}

	@Test
	void shouldCreatePaymentWithSystemCategoryAndListIt() {
		LocalDate dueDate = today.plusDays(3);

		MvcTestResult created = create(body("  Netflix ", "43", "PLN", "MONTHLY", dueDate, expenseCategory.getId()));
		MvcTestResult listed = list();

		assertThat(created).hasStatus(HttpStatus.CREATED);
		assertThat(created).bodyJson().extractingPath("$.name").isEqualTo("Netflix");
		assertThat(created).bodyJson().extractingPath("$.amount").isEqualTo(43.0);
		assertThat(created).bodyJson().extractingPath("$.currency").isEqualTo("PLN");
		assertThat(created).bodyJson().extractingPath("$.frequency").isEqualTo("MONTHLY");
		assertThat(created).bodyJson().extractingPath("$.nextDueDate").isEqualTo(dueDate.toString());
		assertThat(created).bodyJson().extractingPath("$.categoryId").isEqualTo(expenseCategory.getId().intValue());
		assertThat(created).bodyJson().extractingPath("$.categoryName").isEqualTo(expenseCategory.getName());
		assertThat(created).bodyJson().doesNotHavePath("$.userId");
		assertThat(listed).hasStatus(HttpStatus.OK);
		assertThat(listed).bodyJson().extractingPath("$[0].name").isEqualTo("Netflix");
		assertThat(listed).bodyJson().extractingPath("$[0].categoryName").isEqualTo(expenseCategory.getName());
		List<RecurringPaymentEntity> rows = ownPayments();
		assertThat(rows).hasSize(1);
		assertThat(rows.get(0).getName()).isEqualTo("Netflix");
		assertThat(rows.get(0).getAmount()).isEqualByComparingTo(new BigDecimal("43.00"));
		assertThat(rows.get(0).getUserId()).isEqualTo(user.getId());
	}

	@Test
	void shouldCreatePaymentWithOwnCategory() {
		CategoryEntity own = categoryRepository.saveAndFlush(
				new CategoryEntity(user.getId(), "Siłownia", null, TransactionType.EXPENSE));

		MvcTestResult created = create(body("Karnet", "99.99", "EUR", "YEARLY", today.plusMonths(1), own.getId()));

		assertThat(created).hasStatus(HttpStatus.CREATED);
		assertThat(created).bodyJson().extractingPath("$.categoryName").isEqualTo("Siłownia");
		assertThat(created).bodyJson().extractingPath("$.currency").isEqualTo("EUR");
		assertThat(created).bodyJson().extractingPath("$.frequency").isEqualTo("YEARLY");
		assertThat(ownPayments()).hasSize(1);
	}

	@Test
	void shouldListOnlyOwnPaymentsSortedByNextDueDateThenId() {
		recurringPaymentRepository.saveAndFlush(payment(user, "Późna", today.plusDays(20)));
		recurringPaymentRepository.saveAndFlush(payment(user, "Wcześniejsza 1", today.plusDays(2)));
		recurringPaymentRepository.saveAndFlush(payment(otherUser, "Cudza", today.plusDays(1)));
		recurringPaymentRepository.saveAndFlush(payment(user, "Wcześniejsza 2", today.plusDays(2)));

		MvcTestResult listed = list();

		assertThat(listed).hasStatus(HttpStatus.OK);
		assertThat(listed).bodyJson().extractingPath("$.length()").isEqualTo(3);
		assertThat(listed).bodyJson().extractingPath("$[0].name").isEqualTo("Wcześniejsza 1");
		assertThat(listed).bodyJson().extractingPath("$[1].name").isEqualTo("Wcześniejsza 2");
		assertThat(listed).bodyJson().extractingPath("$[2].name").isEqualTo("Późna");
	}

	@Test
	void shouldLoadCategoryTogetherWithPaymentsInOneQuery() {
		recurringPaymentRepository.saveAndFlush(payment(user, "Netflix", today.plusDays(1)));
		recurringPaymentRepository.saveAndFlush(payment(user, "Spotify", today.plusDays(2)));
		entityManager.clear();

		List<RecurringPaymentEntity> loaded =
				recurringPaymentRepository.findAllByUserIdOrderByNextDueDateAscIdAsc(user.getId());

		PersistenceUnitUtil util = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();
		assertThat(loaded).hasSize(2);
		assertThat(loaded).allSatisfy(payment -> assertThat(util.isLoaded(payment, "category")).isTrue());
	}

	@Test
	void shouldAcceptDueDateToday() {
		MvcTestResult created = create(body("Czynsz", "850.00", "PLN", "MONTHLY", today, expenseCategory.getId()));

		assertThat(created).hasStatus(HttpStatus.CREATED);
		assertThat(created).bodyJson().extractingPath("$.nextDueDate").isEqualTo(today.toString());
	}

	@Test
	void shouldReturn404AndSaveNothingWhenCategoryBelongsToAnotherUser() {
		CategoryEntity foreign = categoryRepository.saveAndFlush(
				new CategoryEntity(otherUser.getId(), "Cudza kategoria", null, TransactionType.EXPENSE));

		MvcTestResult created = create(body("Netflix", "43.00", "PLN", "MONTHLY", today.plusDays(1), foreign.getId()));

		assertThat(created).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(created).bodyJson().extractingPath("$.title").isEqualTo("Nie znaleziono zasobu");
		assertThat(ownPayments()).isEmpty();
	}

	@Test
	void shouldReturn404AndSaveNothingWhenCategoryDoesNotExist() {
		MvcTestResult created = create(body("Netflix", "43.00", "PLN", "MONTHLY", today.plusDays(1), MISSING_CATEGORY_ID));

		assertThat(created).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(ownPayments()).isEmpty();
	}

	@Test
	void shouldReturn400AndSaveNothingWhenCategoryIsIncome() {
		MvcTestResult created = create(body("Netflix", "43.00", "PLN", "MONTHLY", today.plusDays(1), incomeCategory.getId()));

		assertThat(created).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(created).bodyJson().extractingPath("$.title").isEqualTo("Nieprawidłowa kategoria");
		assertThat(ownPayments()).isEmpty();
	}

	@Test
	void shouldReturn400AndSaveNothingWhenDueDateIsYesterday() {
		MvcTestResult created = create(body("Netflix", "43.00", "PLN", "MONTHLY", today.minusDays(1), expenseCategory.getId()));

		assertThat(created).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(created).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("nextDueDate");
		assertThat(ownPayments()).isEmpty();
	}

	@Test
	void shouldReturn400AndSaveNothingWhenFrequencyIsUnknown() {
		MvcTestResult created = create(body("Netflix", "43.00", "PLN", "DAILY", today.plusDays(1), expenseCategory.getId()));

		assertThat(created).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(ownPayments()).isEmpty();
	}

	@Test
	void shouldReturn401WithoutToken() {
		MvcTestResult listed = mvc.get().uri(PAYMENTS_URI).exchange();
		MvcTestResult created = mvc.post().uri(PAYMENTS_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("Netflix", "43.00", "PLN", "MONTHLY", today.plusDays(1), expenseCategory.getId()))
				.exchange();

		assertThat(listed).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(created).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(ownPayments()).isEmpty();
	}

	private MvcTestResult create(String body) {
		return mvc.post().uri(PAYMENTS_URI)
				.header(HttpHeaders.AUTHORIZATION, bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult list() {
		return mvc.get().uri(PAYMENTS_URI).header(HttpHeaders.AUTHORIZATION, bearer()).exchange();
	}

	private String bearer() {
		return "Bearer " + token;
	}

	private static String body(String name, String amount, String currency, String frequency, LocalDate nextDueDate,
			Long categoryId) {
		return """
				{"name": "%s", "amount": %s, "currency": "%s", "frequency": "%s",
				 "nextDueDate": "%s", "categoryId": %d}""".formatted(name, amount, currency, frequency, nextDueDate, categoryId);
	}

	private static CategoryEntity firstOfType(List<CategoryEntity> categories, TransactionType type) {
		return categories.stream()
				.filter(category -> category.getType() == type)
				.findFirst()
				.orElseThrow();
	}

	private RecurringPaymentEntity payment(UserEntity owner, String name, LocalDate nextDueDate) {
		return new RecurringPaymentEntity(owner.getId(), name, new BigDecimal("43.00"), SupportedCurrency.PLN,
				PaymentFrequency.MONTHLY, nextDueDate, expenseCategory, Instant.now(clock));
	}

	private List<RecurringPaymentEntity> ownPayments() {
		return recurringPaymentRepository.findAll().stream()
				.filter(payment -> payment.getUserId().equals(user.getId()))
				.toList();
	}

}
