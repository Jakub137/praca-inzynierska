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
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class TransactionRepositoryTest {

	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");
	private static final LocalDate DATE = LocalDate.of(2026, 11, 14);

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

}
