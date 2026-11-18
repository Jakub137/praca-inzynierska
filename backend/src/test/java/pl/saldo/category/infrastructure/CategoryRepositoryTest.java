package pl.saldo.category.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class CategoryRepositoryTest {

	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");
		private static final Sort ORDER = Sort.by(CategoryEntity::getType, CategoryEntity::getName, CategoryEntity::getId);
	private static final int SYSTEM_CATEGORY_COUNT = 11;

	private final CategoryRepository categoryRepository;
	private final UserRepository userRepository;
	private final EntityManager entityManager;

	@Autowired
	CategoryRepositoryTest(
			CategoryRepository categoryRepository, UserRepository userRepository, EntityManager entityManager) {
		this.categoryRepository = categoryRepository;
		this.userRepository = userRepository;
		this.entityManager = entityManager;
	}

	// "Ćwiczenia" separates ICU pl-PL collation (Ć right after C) from binary order (Ć after Z).
	@Test
	void shouldReturnSystemAndOwnCategoriesInPolishCollationOrder() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		categoryRepository.save(new CategoryEntity(owner.getId(), "Bilety", "ticket", TransactionType.EXPENSE));
		categoryRepository.save(new CategoryEntity(owner.getId(), "Ćwiczenia", null, TransactionType.EXPENSE));
		categoryRepository.save(new CategoryEntity(owner.getId(), "Alimenty", null, TransactionType.INCOME));
		categoryRepository.save(new CategoryEntity(other.getId(), "Cudza kategoria", null, TransactionType.EXPENSE));
		categoryRepository.flush();

		List<CategoryEntity> result = categoryRepository.findAllByUserIdOrIsDefaultTrue(owner.getId(), ORDER);

		assertThat(result).extracting(CategoryEntity::getName).containsExactly(
				"Artykuły spożywcze", "Bilety", "Ćwiczenia", "Inne wydatki", "Odzież",
				"Rachunki", "Restauracje", "Rozrywka", "Transport", "Zdrowie",
				"Alimenty", "Inne przychody", "Premia", "Wynagrodzenie");
	}

	@Test
	void shouldReturnOnlySystemCategoriesForUserWithoutOwnCategories() {
		UserEntity user = saveUser("owner@example.com");

		List<CategoryEntity> result = categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER);

		assertThat(result).hasSize(SYSTEM_CATEGORY_COUNT);
		assertThat(result).allSatisfy(category -> {
			assertThat(category.getUserId()).isNull();
			assertThat(category.isDefault()).isTrue();
		});
	}

	@Test
	void shouldMapSystemCategoryColumns() {
		UserEntity user = saveUser("owner@example.com");

		CategoryEntity salary = categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER).stream()
				.filter(category -> "Wynagrodzenie".equals(category.getName()))
				.findFirst()
				.orElseThrow();

		assertThat(salary.getId()).isNotNull();
		assertThat(salary.getUserId()).isNull();
		assertThat(salary.getIcon()).isEqualTo("wallet");
		assertThat(salary.getType()).isEqualTo(TransactionType.INCOME);
		assertThat(salary.isDefault()).isTrue();
	}

	@Test
	void shouldPersistAndReloadUserCategoryColumns() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity saved = categoryRepository.saveAndFlush(
				new CategoryEntity(owner.getId(), "Bilety", "ticket", TransactionType.EXPENSE));
		entityManager.clear();

		CategoryEntity loaded = categoryRepository.findById(saved.getId()).orElseThrow();

		assertThat(loaded.getId()).isNotNull();
		assertThat(loaded.getUserId()).isEqualTo(owner.getId());
		assertThat(loaded.getName()).isEqualTo("Bilety");
		assertThat(loaded.getIcon()).isEqualTo("ticket");
		assertThat(loaded.getType()).isEqualTo(TransactionType.EXPENSE);
		assertThat(loaded.isDefault()).isFalse();
	}

	// "żywność" vs "Żywność" needs database-side upper() to follow the ICU pl-PL locale (ADR-006).
	@Test
	void shouldFindDuplicateIgnoringCaseWithPolishLetters() {
		UserEntity owner = saveUser("owner@example.com");
		categoryRepository.saveAndFlush(new CategoryEntity(owner.getId(), "żywność", null, TransactionType.EXPENSE));

		boolean result = categoryRepository.existsDuplicate(owner.getId(), "Żywność", TransactionType.EXPENSE);

		assertThat(result).isTrue();
	}

	@Test
	void shouldFindDuplicateOfSystemCategoryOfTheSameType() {
		UserEntity user = saveUser("owner@example.com");

		boolean result = categoryRepository.existsDuplicate(user.getId(), "transport", TransactionType.EXPENSE);

		assertThat(result).isTrue();
	}

	@Test
	void shouldNotFindDuplicateWhenTypeDiffers() {
		UserEntity owner = saveUser("owner@example.com");
		categoryRepository.saveAndFlush(new CategoryEntity(owner.getId(), "Bilety", null, TransactionType.EXPENSE));

		assertThat(categoryRepository.existsDuplicate(owner.getId(), "Bilety", TransactionType.INCOME)).isFalse();
		assertThat(categoryRepository.existsDuplicate(owner.getId(), "Transport", TransactionType.INCOME)).isFalse();
	}

	@Test
	void shouldNotFindDuplicateOwnedByAnotherUser() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		categoryRepository.saveAndFlush(new CategoryEntity(other.getId(), "Bilety", null, TransactionType.EXPENSE));

		boolean result = categoryRepository.existsDuplicate(owner.getId(), "Bilety", TransactionType.EXPENSE);

		assertThat(result).isFalse();
	}

	@Test
	void shouldNotFindDuplicateForNewName() {
		UserEntity user = saveUser("owner@example.com");

		boolean result = categoryRepository.existsDuplicate(user.getId(), "Zupełnie nowa", TransactionType.EXPENSE);

		assertThat(result).isFalse();
	}

	@Test
	void shouldFindOwnCategoryById() {
		UserEntity owner = saveUser("owner@example.com");
		CategoryEntity saved = categoryRepository.saveAndFlush(
				new CategoryEntity(owner.getId(), "Bilety", null, TransactionType.EXPENSE));

		assertThat(categoryRepository.findAccessibleById(saved.getId(), owner.getId())).isPresent();
	}

	@Test
	void shouldFindSystemCategoryByIdForAnyUser() {
		UserEntity user = saveUser("owner@example.com");
		CategoryEntity system = categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER).get(0);

		assertThat(categoryRepository.findAccessibleById(system.getId(), user.getId())).isPresent();
	}

	@Test
	void shouldNotFindCategoryOwnedByAnotherUser() {
		UserEntity owner = saveUser("owner@example.com");
		UserEntity other = saveUser("other@example.com");
		CategoryEntity foreign = categoryRepository.saveAndFlush(
				new CategoryEntity(other.getId(), "Cudza", null, TransactionType.EXPENSE));

		assertThat(categoryRepository.findAccessibleById(foreign.getId(), owner.getId())).isEmpty();
	}

	@Test
	void shouldNotFindNonexistentCategory() {
		UserEntity user = saveUser("owner@example.com");

		assertThat(categoryRepository.findAccessibleById(Long.MAX_VALUE, user.getId())).isEmpty();
	}

	private UserEntity saveUser(String email) {
		return userRepository.saveAndFlush(
				new UserEntity(email, "hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW));
	}

}
