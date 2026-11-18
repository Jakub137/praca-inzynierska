package pl.saldo.transaction.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.usecase.GetTransactionsQuery;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class TransactionRepositoryTest {

	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");
	private static final LocalDate DATE = LocalDate.of(2026, 11, 14);
	private static final Pageable FIRST_PAGE = GetTransactionsQuery
			.of(null, null, null, null, null, null, null, null).toPageable();

	private final TransactionRepository transactionRepository;
	private final CategoryRepository categoryRepository;
	private final UserRepository userRepository;
	private final EntityManager entityManager;

	@Autowired
	TransactionRepositoryTest(
			TransactionRepository transactionRepository,
			CategoryRepository categoryRepository,
			UserRepository userRepository,
			EntityManager entityManager) {
		this.transactionRepository = transactionRepository;
		this.categoryRepository = categoryRepository;
		this.userRepository = userRepository;
		this.entityManager = entityManager;
	}

	@Test
	void shouldPersistAndReloadAllColumns() {
		UserEntity user = saveUser("owner@example.com");
		CategoryEntity category = findSystemCategory(user, "Transport");
		TransactionEntity saved = transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, new BigDecimal("10.50"), SupportedCurrency.EUR, new BigDecimal("45.15"),
				new BigDecimal("4.3000"), DATE, "Bilet", TransactionType.EXPENSE, NOW));
		entityManager.clear();

		TransactionEntity loaded = transactionRepository.findById(saved.getId()).orElseThrow();

		assertThat(loaded.getId()).isNotNull();
		assertThat(loaded.getUserId()).isEqualTo(user.getId());
		assertThat(loaded.getCategory().getId()).isEqualTo(category.getId());
		assertThat(loaded.getCategory().getName()).isEqualTo("Transport");
		assertThat(loaded.getAmount()).isEqualTo(new BigDecimal("10.50"));
		assertThat(loaded.getCurrency()).isEqualTo(SupportedCurrency.EUR);
		assertThat(loaded.getAmountPln()).isEqualTo(new BigDecimal("45.15"));
		assertThat(loaded.getExchangeRate()).isEqualTo(new BigDecimal("4.3000"));
		assertThat(loaded.getTransactionDate()).isEqualTo(DATE);
		assertThat(loaded.getDescription()).isEqualTo("Bilet");
		assertThat(loaded.getType()).isEqualTo(TransactionType.EXPENSE);
		assertThat(loaded.isRecurring()).isFalse();
		assertThat(loaded.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void shouldPersistPlnTransactionWithRateOneAndNullDescription() {
		UserEntity user = saveUser("owner@example.com");
		CategoryEntity category = findSystemCategory(user, "Transport");
		TransactionEntity saved = transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, new BigDecimal("100.00"), SupportedCurrency.PLN, new BigDecimal("100.00"),
				new BigDecimal("1.0000"), DATE, null, TransactionType.EXPENSE, NOW));
		entityManager.clear();

		TransactionEntity loaded = transactionRepository.findById(saved.getId()).orElseThrow();

		assertThat(loaded.getExchangeRate()).isEqualTo(new BigDecimal("1.0000"));
		assertThat(loaded.getAmountPln()).isEqualTo(new BigDecimal("100.00"));
		assertThat(loaded.getDescription()).isNull();
	}

	@Test
	void shouldFindOwnTransactionWithLoadedCategoryAndHideOtherUsersTransaction() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		CategoryEntity category = findSystemCategory(owner, "Transport");
		TransactionEntity saved = transactionRepository.saveAndFlush(new TransactionEntity(
				owner.getId(), category, new BigDecimal("10.50"), SupportedCurrency.EUR, new BigDecimal("45.15"),
				new BigDecimal("4.3000"), DATE, "Bilet", TransactionType.EXPENSE, NOW));
		entityManager.clear();

		TransactionEntity found = transactionRepository.findByIdAndUserId(saved.getId(), owner.getId()).orElseThrow();

		assertThat(found.getId()).isEqualTo(saved.getId());
		assertThat(entityManager.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(found.getCategory()))
				.isTrue();
		assertThat(transactionRepository.findByIdAndUserId(saved.getId(), other.getId())).isEmpty();
	}

	@Test
	void shouldListOnlyOwnTransactions() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		saveTransaction(owner, transport, "10.00", DATE, TransactionType.EXPENSE, NOW);
		saveTransaction(owner, transport, "20.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(1));
		saveTransaction(other, transport, "30.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(2));

		Page<TransactionEntity> ownerPage = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null), FIRST_PAGE);
		Page<TransactionEntity> otherPage = transactionRepository.findAll(
				TransactionSpecifications.matching(other.getId(), null, null, null, null), FIRST_PAGE);

		assertThat(ownerPage.getTotalElements()).isEqualTo(2);
		assertThat(ownerPage.getContent()).extracting(TransactionEntity::getUserId).containsOnly(owner.getId());
		assertThat(otherPage.getContent()).extracting(TransactionEntity::getUserId).containsOnly(other.getId());
		assertThat(otherPage.getTotalElements()).isEqualTo(1);
	}

	@Test
	void shouldLoadCategoryOfEveryListedTransaction() {
		UserEntity owner = saveUser("owner@example.com");
		saveTransaction(owner, findSystemCategory(owner, "Transport"), "10.00", DATE, TransactionType.EXPENSE, NOW);
		saveTransaction(owner, findSystemCategory(owner, "Rozrywka"), "20.00", DATE, TransactionType.EXPENSE,
				NOW.plusSeconds(1));
		saveTransaction(owner, findSystemCategory(owner, "Wynagrodzenie"), "30.00", DATE, TransactionType.INCOME,
				NOW.plusSeconds(2));
		entityManager.clear();

		Page<TransactionEntity> page = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null), FIRST_PAGE);

		assertThat(page.getContent()).hasSize(3);
		assertThat(page.getContent()).allSatisfy(transaction -> assertThat(entityManager.getEntityManagerFactory()
				.getPersistenceUnitUtil().isLoaded(transaction.getCategory())).isTrue());
	}

	@Test
	void shouldKeepTotalsCorrectAcrossPages() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		for (int i = 0; i < 5; i++) {
			saveTransaction(owner, transport, "10.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(i));
		}
		entityManager.clear();

		Page<TransactionEntity> first = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null),
				GetTransactionsQuery.of(0, 2, null, null, null, null, null, null).toPageable());
		Page<TransactionEntity> last = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null),
				GetTransactionsQuery.of(2, 2, null, null, null, null, null, null).toPageable());

		assertThat(first.getContent()).hasSize(2);
		assertThat(first.getTotalElements()).isEqualTo(5);
		assertThat(first.getTotalPages()).isEqualTo(3);
		assertThat(last.getContent()).hasSize(1);
		assertThat(last.getTotalElements()).isEqualTo(5);
		assertThat(last.getTotalPages()).isEqualTo(3);
	}

	@Test
	void shouldFilterByCategoryAndType() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		CategoryEntity salary = findSystemCategory(owner, "Wynagrodzenie");
		saveTransaction(owner, transport, "10.00", DATE, TransactionType.EXPENSE, NOW);
		saveTransaction(owner, transport, "20.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(1));
		saveTransaction(owner, salary, "30.00", DATE, TransactionType.INCOME, NOW.plusSeconds(2));

		Page<TransactionEntity> byCategory = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), transport.getId(), null, null, null), FIRST_PAGE);
		Page<TransactionEntity> byType = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, TransactionType.INCOME, null, null),
				FIRST_PAGE);
		Page<TransactionEntity> byBoth = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), transport.getId(), TransactionType.INCOME, null,
						null),
				FIRST_PAGE);

		assertThat(byCategory.getTotalElements()).isEqualTo(2);
		assertThat(byType.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactly(new BigDecimal("30.00"));
		assertThat(byBoth.getTotalElements()).isZero();
	}

	@Test
	void shouldFilterByDateRangeInclusively() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		saveTransaction(owner, transport, "1.00", LocalDate.of(2026, 10, 31), TransactionType.EXPENSE, NOW);
		saveTransaction(owner, transport, "2.00", LocalDate.of(2026, 11, 1), TransactionType.EXPENSE,
				NOW.plusSeconds(1));
		saveTransaction(owner, transport, "3.00", LocalDate.of(2026, 11, 30), TransactionType.EXPENSE,
				NOW.plusSeconds(2));
		saveTransaction(owner, transport, "4.00", LocalDate.of(2026, 12, 1), TransactionType.EXPENSE,
				NOW.plusSeconds(3));

		Page<TransactionEntity> november = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, LocalDate.of(2026, 11, 1),
						LocalDate.of(2026, 11, 30)),
				FIRST_PAGE);
		Page<TransactionEntity> fromOnly = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, LocalDate.of(2026, 11, 30), null),
				FIRST_PAGE);
		Page<TransactionEntity> toOnly = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, LocalDate.of(2026, 11, 1)),
				FIRST_PAGE);

		assertThat(november.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactlyInAnyOrder(new BigDecimal("2.00"), new BigDecimal("3.00"));
		assertThat(fromOnly.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactlyInAnyOrder(new BigDecimal("3.00"), new BigDecimal("4.00"));
		assertThat(toOnly.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactlyInAnyOrder(new BigDecimal("1.00"), new BigDecimal("2.00"));
	}

	@Test
	void shouldSortByDateDescendingThenNewestCreatedByDefault() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		saveTransaction(owner, transport, "1.00", LocalDate.of(2026, 11, 10), TransactionType.EXPENSE, NOW);
		saveTransaction(owner, transport, "2.00", LocalDate.of(2026, 11, 12), TransactionType.EXPENSE,
				NOW.plusSeconds(1));
		saveTransaction(owner, transport, "3.00", LocalDate.of(2026, 11, 12), TransactionType.EXPENSE,
				NOW.plusSeconds(2));

		Page<TransactionEntity> page = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null), FIRST_PAGE);

		assertThat(page.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactly(new BigDecimal("3.00"), new BigDecimal("2.00"), new BigDecimal("1.00"));
	}

	@Test
	void shouldSortByAmountPlnInRequestedDirection() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity transport = findSystemCategory(owner, "Transport");
		saveTransaction(owner, transport, "10.00", DATE, TransactionType.EXPENSE, NOW);
		saveTransaction(owner, transport, "30.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(1));
		saveTransaction(owner, transport, "20.00", DATE, TransactionType.EXPENSE, NOW.plusSeconds(2));

		Page<TransactionEntity> descending = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null),
				GetTransactionsQuery.of(null, null, "amountPln", "desc", null, null, null, null).toPageable());
		Page<TransactionEntity> ascending = transactionRepository.findAll(
				TransactionSpecifications.matching(owner.getId(), null, null, null, null),
				GetTransactionsQuery.of(null, null, "amountPln", "asc", null, null, null, null).toPageable());

		assertThat(descending.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactly(new BigDecimal("30.00"), new BigDecimal("20.00"), new BigDecimal("10.00"));
		assertThat(ascending.getContent()).extracting(TransactionEntity::getAmountPln)
				.containsExactly(new BigDecimal("10.00"), new BigDecimal("20.00"), new BigDecimal("30.00"));
	}

	private CategoryEntity findSystemCategory(UserEntity user, String name) {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), Sort.unsorted()).stream()
				.filter(category -> name.equals(category.getName()))
				.findFirst()
				.orElseThrow();
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(
				new UserEntity(email, "hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW));
	}

	private TransactionEntity saveTransaction(UserEntity user, CategoryEntity category, String amountPln,
			LocalDate date, TransactionType type, Instant createdAt) {
		return transactionRepository.saveAndFlush(new TransactionEntity(
				user.getId(), category, new BigDecimal(amountPln), SupportedCurrency.PLN, new BigDecimal(amountPln),
				new BigDecimal("1.0000"), date, null, type, createdAt));
	}

}
